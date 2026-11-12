import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext.js';
import { searchUsers } from '../services/userService.js';
import { getAvatarUrl } from '../utils/avatar.js';
import CalendarGrid from '../components/calendar/CalendarGrid.jsx';

function CalendarPage() {
    const { logout, user } = useAuthContext();
    const navigate = useNavigate();
    const [searchEmail, setSearchEmail] = useState('');
    const [users, setUsers] = useState([]);
    const [error, setError] = useState('');

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

    return (
        <div>
            <h1>Calendar</h1>

            {user && (
                <div>
                    <img className="avatar" src={getAvatarUrl(user.avatarPath)} alt="Avatar" width="100" height="100"/>
                    <p>{user.login}</p>
                    <p>{user.email}</p>
                </div>
            )}

            <button onClick={() => navigate('/profile')}>Profile settings</button>

            <form onSubmit={handleSearch}>
                <input type="text" placeholder="Search users by email" value={searchEmail}
                       onChange={(e) => setSearchEmail(e.target.value)} required />
                <button type="submit">Search</button>
                <button type="button" onClick={() => {setSearchEmail(''); setUsers([]);}}>Clear</button>
            </form>

            {users.map((item) => (
                <div key={item.id}>
                    <img className="avatar" src={getAvatarUrl(item.avatarPath)} alt="Avatar" width="50" height="50" />
                    <p>{item.login}</p>
                    <p>{item.email}</p>
                    <Link to={`/users/${item.id}`}>View Profile</Link>
                </div>
            ))}

            {error && <p>{error}</p>}

            <button onClick={logout}>Log out</button>

            <br/><br/>
            <CalendarGrid />
        </div>
    );
}

export default CalendarPage;