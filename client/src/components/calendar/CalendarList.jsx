import { useState } from 'react';
import {createCalendar, deleteCalendar, toggleCalendarVisibility, removeSharedMember, updateCalendar, updateSharedMemberRole} from '../../services/calendarService.js';
import CalendarForm from './CalendarForm.jsx';
import ShareForm from '../ShareForm.jsx';
import CalendarDetails from './CalendarDetails.jsx';

function CalendarList({ calendars, user, onUpdate }) {
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [shareCalendarObj, setShareCalendarObj] = useState(null);
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
            await updateCalendar(calendarData.id, calendarData);
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

    const handleRemoveMember = async (calendarId, userId) => {
        setError('');
        try {
            await removeSharedMember(calendarId, userId);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleRoleChange = async (calendarId, userId, newRole) => {
        setError('');
        try {
            await updateSharedMemberRole(calendarId, userId, newRole);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update role');
        }
    };

    const startEditing = (calendar) => {
        setEditingCalendar(calendar);
    };

    const sharedCalendars = calendars.shared.map(cal => {
        const myMemberData = cal.sharedWith?.find(member => {
            const memberId = member.user?.id || member.user;
            const currentUserId = user?.id;
            return String(memberId) === String(currentUserId);
        });
        return {
            ...cal,
            myRole: myMemberData?.role,
            myStatus: myMemberData?.status,
            myIsHidden: myMemberData?.isHidden ?? false,
            isEditor: myMemberData?.role === 'editor'
        };
    });

    const acceptedShared = sharedCalendars.filter(cal => cal.myStatus === 'accepted');

    const getMemberName = (member) => {
        const memberObj = member.user;
        return memberObj?.login || memberObj?.email || memberObj?.id || memberObj;
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
                    <li key={cal.id}>
                        {cal.name} {cal.isDefault ? '(default)' : ''}
                        <button type="button" onClick={() => setViewingCalendar(cal)}>Details</button>
                        <button type="button" onClick={() => startEditing(cal)}>Edit</button>

                        {!cal.isDefault && (
                            <button type="button" onClick={() => handleToggleVisibility(cal.id, cal.isHidden)}>{cal.isHidden ? 'Show' : 'Hide'}</button>
                        )}

                        <button type="button" onClick={() => setShareCalendarObj(cal)}>Share</button>

                        {!cal.isDefault && (
                            <button type="button" onClick={() => handleDeleteCalendar(cal.id)}>Delete</button>
                        )}

                        {editingCalendar?.id === cal.id && (
                            <CalendarForm
                                key={cal.id}
                                calendar={cal}
                                onSubmit={handleUpdateCalendar}
                                onCancel={() => setEditingCalendar(null)}
                            />
                        )}

                        {cal.sharedWith?.length > 0 && (
                            <ul>
                                {cal.sharedWith.map(member => {
                                    const memberObj = member.user;
                                    const displayId = memberObj?.id || memberObj;

                                    return (
                                        <li key={displayId}>
                                            {getMemberName(member)} {member.status === 'pending' && '(pending)'}

                                            <select value={member.role} onChange={(e) => handleRoleChange(cal.id, displayId, e.target.value)}>
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                            </select>

                                            <button type="button" onClick={() => handleRemoveMember(cal.id, displayId)}>Remove</button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </li>
                ))}
            </ul>

            {shareCalendarObj && (
                <ShareForm
                    type="calendar"
                    calendar={shareCalendarObj}
                    onUpdate={onUpdate}
                    onCancel={() => setShareCalendarObj(null)}
                />
            )}

            <h3>Shared</h3>
            {acceptedShared.length > 0 ? (
                <ul>
                    {acceptedShared.map(cal => (
                        <li key={cal.id}>
                            {cal.name} ({cal.myRole})
                            <button type="button" onClick={() => setViewingCalendar(cal)}>Details</button>

                            {cal.isEditor && (
                                <button type="button" onClick={() => startEditing(cal)}>Edit</button>
                            )}

                            <button type="button" onClick={() => handleToggleVisibility(cal.id, cal.myIsHidden)}>
                                {cal.myIsHidden ? 'Show' : 'Hide'}
                            </button>

                            {editingCalendar?.id === cal.id && cal.isEditor && (
                                <CalendarForm
                                    key={cal.id}
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