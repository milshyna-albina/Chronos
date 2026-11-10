import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { getUserById } from '../../services/userService.js';
import { getAvatarUrl } from '../../utils/avatar.js';

function UserProfilePage() {
    const { id } = useParams();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const result = await getUserById(id);
                setProfile(result.user);
            } catch (err) {
                setError(err.response?.data?.message || 'Server error');
            }
        };

        fetchUser();
    }, [id]);

    return (
        <div>
            <h1>User profile</h1>

            {profile && (
                <div>
                    <img src={getAvatarUrl(profile.avatarPath)} alt="Avatar" width="100" height="100" />
                    <p>Login: {profile.login}</p>
                    <p>Email: {profile.email}</p>
                </div>
            )}

            {error && <p>{error}</p>}

            <button onClick={() => window.history.back()}>Back</button>
        </div>
    );
}

export default UserProfilePage;