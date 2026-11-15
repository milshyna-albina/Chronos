import { useState } from 'react';
import { shareCalendar, generateShareLink, disableShareLink } from '../../services/calendarService.js';
import { searchUsers } from '../../services/userService.js';
import { getAvatarUrl } from '../../utils/avatar.js';

function ShareCalendarForm({ calendar, onUpdate, onCancel }) {
    const [searchEmail, setSearchEmail] = useState('');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState({});
    const [linkRole, setLinkRole] = useState(calendar.publicRole || 'viewer');
    const [generatedLink, setGeneratedLink] = useState('');
    const [error, setError] = useState('');
    const [isPublicEnabled, setIsPublicEnabled] = useState(calendar.isPublicEnabled);

    const handleSearch = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await searchUsers(searchEmail);
            setUsers(result.users || []);
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    const handleSendInvite = async (email, userId) => {
        setError('');
        try {
            const userRole = roles[userId] || 'viewer';
            await shareCalendar(calendar.id, { email, role: userRole });
            setUsers(users.filter(u => u.id !== userId));
            onUpdate();
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
            const res = await generateShareLink(calendar.id, linkRole);
            setGeneratedLink(res.link);
            setIsPublicEnabled(true);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Error generating link');
        }
    };

    const handleDisableLink = async () => {
        setError('');
        try {
            await disableShareLink(calendar.id);
            setGeneratedLink('');
            setIsPublicEnabled(false);
            onUpdate();
        } catch (err) {
            setError(err.response?.data?.message || 'Error disabling link');
        }
    };
    return (
        <div>
            <h4>Share calendar</h4>

            <div>
                <h5>By email</h5>
                <form onSubmit={handleSearch}>
                    <input type="text" placeholder="Search users by email" value={searchEmail}
                           onChange={(e) => setSearchEmail(e.target.value)} required />
                    <button type="submit">Search</button>
                    <button type="button" onClick={() => {setSearchEmail(''); setUsers([]);}}>Clear</button>
                </form>

                {users.length > 0 && (
                    <div>
                        {users.map((item) => (
                            <div key={item.id}>
                                <img className="avatar" src={getAvatarUrl(item.avatarPath)} alt="Avatar" width="30" height="30" />
                                <span> {item.login} {item.email} </span>
                                <select value={roles[item.id] || 'viewer'} onChange={(e) => handleRoleChange(item.id, e.target.value)}>
                                    <option value="viewer">Viewer</option>
                                    <option value="editor">Editor</option>
                                </select>
                                <button type="button" onClick={() => handleSendInvite(item.email, item.id)}>Send</button>
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

export default ShareCalendarForm;