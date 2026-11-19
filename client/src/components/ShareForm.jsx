import { useState } from 'react';
import {shareCalendar, generateShareLink, disableShareLink} from '../services/calendarService.js';
import {shareEvent, generateEventShareLink, disableEventShareLink} from '../services/eventService.js';
import { searchUsers } from '../services/userService.js';
import { getAvatarUrl } from '../utils/avatar.js';

function ShareForm({ type, calendar, event, calendarId, onUpdate, onCancel }) {
    const isEvent = type === 'event';
    const item = isEvent ? event : calendar;
    const itemId = isEvent ? event.id : calendar.id;
    const currentCalendarId = isEvent ? calendarId : calendar.id;
    const [searchEmail, setSearchEmail] = useState('');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState({});
    const [linkRole, setLinkRole] = useState(item.publicRole || 'viewer');
    const [generatedLink, setGeneratedLink] = useState('');
    const [error, setError] = useState('');
    const [isPublicEnabled, setIsPublicEnabled] = useState(item.isPublicEnabled);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const result = await searchUsers(searchEmail);
            setUsers(result.users || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    const handleSendInvite = async (email, userId) => {
        setError('');
        try {
            const userRole = roles[userId] || 'viewer';
            if (isEvent) {
                await shareEvent(currentCalendarId, itemId, {
                    email,
                    role: userRole
                });
            } else {
                await shareCalendar(itemId, {
                    email,
                    role: userRole
                });
            }

            setUsers(prev => prev.filter(user => user.id !== userId));
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send invite');
        }
    };

    const handleRoleChange = (userId, newRole) => {
        setRoles(prev => ({ ...prev, [userId]: newRole }));
    };

    const handleGenerateLink = async () => {
        setError('');
        try {
            const res = isEvent
                ? await generateEventShareLink(currentCalendarId, itemId, linkRole)
                : await generateShareLink(itemId, linkRole);

            setGeneratedLink(res.link);
            setIsPublicEnabled(true);

            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Error generating link');
        }
    };

    const handleDisableLink = async () => {
        setError('');
        try {
            if (isEvent) {
                await disableEventShareLink(currentCalendarId, itemId);
            } else {
                await disableShareLink(itemId);
            }

            setGeneratedLink('');
            setIsPublicEnabled(false);
            if (onUpdate) onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Error disabling link');
        }
    };

    return (
        <div>
            <h4>Share {isEvent ? 'event' : 'calendar'}</h4>

            <div>
                <h5>By email</h5>
                <form onSubmit={handleSearch}>
                    <input type="text" placeholder="Search users by email" value={searchEmail} onChange={(e) => setSearchEmail(e.target.value)} required />
                    <button type="submit">Search</button>
                    <button type="button" onClick={() => {setSearchEmail(''); setUsers([]);}}>Clear</button>
                </form>
                {users.length > 0 && (
                    <div>
                        {users.map(user => (
                            <div key={user.id}>
                                <img className="avatar" src={getAvatarUrl(user.avatarPath)} alt="Avatar" width="30" height="30" />
                                <span> {user.login} {user.email} </span>
                                <select value={roles[user.id] || 'viewer'} onChange={(e) => handleRoleChange(user.id, e.target.value)}>
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button type="button" onClick={() => handleSendInvite(user.email, user.id)}>Send</button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div>
                <h5>Public link</h5>
                <select value={linkRole} onChange={(e) => setLinkRole(e.target.value)}>
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                </select>
                <button type="button" onClick={handleGenerateLink}>Generate</button>
                {isPublicEnabled && (<button type="button" onClick={handleDisableLink}>Disable</button>)}
                {generatedLink && (
                    <div>
                        <input type="text" readOnly value={generatedLink} />
                    </div>
                )}
            </div>

            {error && <p>{error}</p>}
            <button type="button" onClick={onCancel}>Close</button>
        </div>
    );
}

export default ShareForm;