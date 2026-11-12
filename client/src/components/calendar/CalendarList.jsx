import { useState } from 'react';
import {createCalendar, deleteCalendar, toggleCalendarVisibility, shareCalendar, removeSharedMember, updateCalendar} from '../../services/calendarService.js';
import CalendarForm from './CalendarForm.jsx';
import ShareCalendarForm from './ShareCalendarForm.jsx';
import CalendarDetails from './CalendarDetails.jsx';

function CalendarList({ calendars, user, onUpdate }) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [shareCalendarId, setShareCalendarId] = useState(null);
    const [editingCalendar, setEditingCalendar] = useState(null);
    const [viewingCalendar, setViewingCalendar] = useState(null);
    const [error, setError] = useState('');

    const handleCreateCalendar = async (calendarData) => {
        setError('');
        try {
            await createCalendar(calendarData);
            setShowCreateForm(false);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    const handleUpdateCalendar = async (calendarData) => {
        setError('');
        try {
            await updateCalendar(editingCalendar._id, calendarData);
            setEditingCalendar(null);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update calendar');
        }
    };

    const handleDeleteCalendar = async (calendarId) => {
        setError('');
        try {
            await deleteCalendar(calendarId);
            setViewingCalendar(null);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to delete calendar');
        }
    };

    const handleToggleVisibility = async (calendarId, currentStatus) => {
        setError('');
        try {
            await toggleCalendarVisibility(calendarId, !currentStatus);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to toggle visibility');
        }
    };

    const handleShareCalendar = async (shareData) => {
        setError('');
        try {
            await shareCalendar(shareCalendarId, shareData);
            setShareCalendarId(null);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to share calendar');
        }
    };

    const handleRemoveMember = async (calendarId, userId) => {
        setError('');
        try {
            await removeSharedMember(calendarId, userId);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const startEditing = (calendar) => {
        setEditingCalendar(calendar);
    };

    const sharedCalendars = calendars.shared.map(cal => {
        const myMemberData = cal.sharedWith?.find(member => {
            const memberId = member.userId?._id || member.userId;
            const currentUserId = user?._id || user?.id;
            return String(memberId) === String(currentUserId);
        });
        return {
            ...cal,
            myRole: myMemberData?.role,
            myIsHidden: myMemberData?.isHidden ?? false,
            isEditor: myMemberData?.role === 'editor'
        };
    });

    const getMemberName = (member) => {
        const memberObj = member.userId;
        return memberObj?.login || memberObj?.email || memberObj?._id || memberObj;
    };

    return (
        <div>
            <h3>My calendars</h3>

            {showCreateForm ? (
                <CalendarForm
                    onSubmit={handleCreateCalendar}
                    onCancel={() => setShowCreateForm(false)}
                />
            ) : (
                <button onClick={() => setShowCreateForm(true)}>Create calendar</button>
            )}

            <ul>
                {calendars.owned.map(cal => (
                    <li key={cal._id}>
                        {cal.name} {cal.isDefault ? '(default)' : ''}
                        <button type="button" onClick={() => setViewingCalendar(cal)}>Details</button>
                        <button type="button" onClick={() => startEditing(cal)}>Edit</button>

                        {!cal.isDefault && (
                            <button type="button" onClick={() => handleToggleVisibility(cal._id, cal.isHidden)}>{cal.isHidden ? 'Show' : 'Hide'}</button>
                        )}

                        <button type="button" onClick={() => setShareCalendarId(cal._id)}>Share</button>

                        {!cal.isDefault && (
                            <button type="button" onClick={() => handleDeleteCalendar(cal._id)}>Delete</button>
                        )}

                        {editingCalendar?._id === cal._id && (
                            <CalendarForm
                                key={cal._id}
                                calendar={cal}
                                onSubmit={handleUpdateCalendar}
                                onCancel={() => setEditingCalendar(null)}
                            />
                        )}

                        {cal.sharedWith?.length > 0 && (
                            <ul>
                                {cal.sharedWith.map(member => {
                                    const memberObj = member.userId;
                                    const displayId = memberObj?._id || memberObj;

                                    return (
                                        <li key={displayId}>
                                            {getMemberName(member)} ({member.role})
                                            <button type="button" onClick={() => handleRemoveMember(cal._id, displayId)}>Remove</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>

            {shareCalendarId && (
                <ShareCalendarForm
                    onSubmit={handleShareCalendar}
                    onCancel={() => setShareCalendarId(null)}
                />
            )}

            <h3>Shared</h3>

            {sharedCalendars.length > 0 ? (
                <ul>
                    {sharedCalendars.map(cal => (
                        <li key={cal._id}>
                            {cal.name} ({cal.myRole})
                            <button type="button" onClick={() => setViewingCalendar(cal)}>Details</button>

                            {cal.isEditor && (
                                <button type="button" onClick={() => startEditing(cal)}>Edit</button>
                            )}

                            <button type="button" onClick={() => handleToggleVisibility(cal._id, cal.myIsHidden)}>
                                {cal.myIsHidden ? 'Show' : 'Hide'}
                            </button>

                            {editingCalendar?._id === cal._id && cal.isEditor && (
                                <CalendarForm
                                    key={cal._id}
                                    calendar={cal}
                                    onSubmit={handleUpdateCalendar}
                                    onCancel={() => setEditingCalendar(null)}
                                />
                            )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p>No calendars have been shared with you.</p>
            )}

            {viewingCalendar && (
                <CalendarDetails
                    calendar={viewingCalendar}
                    onClose={() => setViewingCalendar(null)}
                />
            )}

            {error && <p>{error}</p>}
        </div>
    );
}

export default CalendarList;