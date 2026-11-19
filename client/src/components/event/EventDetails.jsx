import { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.js';
import ShareForm from '../ShareForm.jsx';
import {respondToEventInvite, removeEventMember, updateEventMemberRole} from '../../services/eventService.js';

function EventDetails({ event, onClose, onEdit, onDelete, onUpdate }) {
    const { user } = useAuthContext();
    const [showShareForm, setShowShareForm] = useState(false);
    const [error, setError] = useState('');
    const [participants, setParticipants] = useState(event.participants || []);

    useEffect(() => {
        setParticipants(event.participants || []);
    }, [event]);

    const isPendingParticipant = participants.some(
        participant =>
            String(participant.user?.id || participant.user) === String(user?.id) && participant.status === 'pending'
    );

    const canEdit = event.isEditable && !isPendingParticipant;
    const canDelete = event.isDeletable && !isPendingParticipant;
    const canShare = event.isShareable && !isPendingParticipant;

    const handleResponse = async (action) => {
        setError('');
        try {
            await respondToEventInvite(event.calendarId, event.id, action);
            if (onUpdate) await onUpdate();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    const handleRemoveMember = async (userId) => {
        setError('');
        try {
            await removeEventMember(event.calendarId, event.id, userId);

            setParticipants(prev =>
                prev.filter(member =>
                    String(member.user?.id || member.user) !== String(userId)
                )
            );
            if (onUpdate) await onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove member');
        }
    };

    const handleRoleChange = async (userId, newRole) => {
        setError('');
        try {
            await updateEventMemberRole(event.calendarId, event.id, userId, newRole);
            setParticipants(prev =>
                prev.map(member =>
                    String(member.user?.id || member.user) === String(userId)
                        ? { ...member, role: newRole }
                        : member
                )
            );
            if (onUpdate) await onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update role');
        }
    };

    return (
        <div>
            <h3>Event details</h3>
            <p>Name: {event.name}</p>
            {event.calendarName && <p>Calendar: {event.calendarName}</p>}
            {event.eventCreator && <p>Creator: {event.eventCreator}</p>}
            <p>Type: {event.type}</p>
            {event.description && <p>Description: {event.description}</p>}
            <p>Start: {new Date(event.startDate).toLocaleString()}</p>
            <p>End: {new Date(event.endDate).toLocaleString()}</p>
            {event.location && <p>Location: {event.location}</p>}
            {event.tags && event.tags.length > 0 && (
                <div>
                    <p>Tags:</p>
                    <div>
                        {event.tags.map(tag => (
                            <div key={tag.id} style={{ backgroundColor: tag.color }}>
                                {tag.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}
            <p>
                Notification: {event.notificationChannel}
                {event.notificationChannel !== 'none' && event.type !== 'reminder' && ` (${event.reminderMinutesBefore} min before)`}
            </p>
            {participants.length > 0 && (
                <div>
                    <p>Shared with:</p>
                    <ul>
                        {participants.map(member => {
                            const memberId = member.user?.id || member.user;
                            const isSelf = String(memberId) === String(user?.id);
                            const isPending = member.status === 'pending';
                            const hideControls = isSelf || isPending;

                            return (
                                <li key={memberId}>
                                    {member.user?.login || member.user?.email}
                                    {isPending && ' (pending)'}
                                    {canEdit && !hideControls ? (
                                        <span>
                                            <select value={member.role} onChange={e => handleRoleChange(memberId, e.target.value)}>
                                                <option value="viewer">Viewer</option>
                                                <option value="editor">Editor</option>
                                            </select>
                                            <button onClick={() => handleRemoveMember(memberId)}>Remove</button>
                                        </span>
                                    ) : (
                                        <span> ({member.role})</span>
                                    )}
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {isPendingParticipant && (
                <div>
                    <p>You are invited to this event.</p>
                    <button onClick={() => handleResponse('accept')}>Accept</button>
                    <button onClick={() => handleResponse('decline')}>Decline</button>
                </div>
            )}

            {error && <p>{error}</p>}

            {canEdit && (<button onClick={() => onEdit(event)}>Edit</button>)}
            {canShare && (<button onClick={() => setShowShareForm(prev => !prev)}>Share</button>)}
            {canDelete && (<button onClick={() => onDelete(event.calendarId, event.id)}>Delete</button>)}

            {showShareForm && canShare && (
                <ShareForm
                    type="event"
                    calendarId={event.calendarId}
                    event={event}
                    onUpdate={onUpdate}
                    onCancel={() => setShowShareForm(false)}
                />
            )}

            <button onClick={onClose}>Close</button>
        </div>
    );
}

export default EventDetails;