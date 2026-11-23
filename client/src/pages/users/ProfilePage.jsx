import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext.js';
import { updateAvatar, updateUser, deleteUser } from '../../services/userService.js';
import { getAvatarUrl } from '../../utils/avatar.js';
import { COUNTRIES } from '../../utils/countries.js';

function ProfilePage() {
    const { user, login, logout } = useAuthContext();
    const navigate = useNavigate();
    const [userLogin, setUserLogin] = useState(user?.login || '');
    const [email, setEmail] = useState(user?.email || '');
    const [country, setCountry] = useState(user?.country || 'UA');
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState('');

    const handleUpdate = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await updateUser({
                login: userLogin,
                email,
                country
            });
            let updatedUser = result.user;
            if (avatar) {
                const avatarResult = await updateAvatar(avatar);
                updatedUser = {
                    ...updatedUser,
                    avatarPath: avatarResult.avatarPath
                };
            }
            login(updatedUser);
            setAvatar(null);
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    const handleDelete = async () => {
        try {
            await deleteUser();
            await logout();
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    return (
        <div>
            <h1>Profile</h1>

            {user && (
                <div>
                    <img className="avatar" src={getAvatarUrl(user.avatarPath)} alt="Avatar" width="100" height="100" />
                    <p>Login: {user.login}</p>
                    <p>Email: {user.email}</p>
                    <p>Country: {user.country || 'UA'}</p>
                </div>
            )}

            <h2>Edit profile</h2>

            <form onSubmit={handleUpdate}>
                <div>
                    <label>Login</label>
                    <input type="text" value={userLogin} onChange={(e) => setUserLogin(e.target.value)} required />
                </div>

                <div>
                    <label>Email</label>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                    <label>Country</label>
                    <select value={country} onChange={(e) => setCountry(e.target.value)}>
                        {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                                {c.name} ({c.code})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Avatar</label>
                    <input type="file" accept="image/*" onChange={(e) => setAvatar(e.target.files[0])} />
                </div>

                <button type="submit">Save changes</button>
            </form>

            {error && <p>{error}</p>}

            <button onClick={handleDelete}>Delete account</button>
            <br/>
            <button onClick={() => navigate('/calendar')}>Back</button>
        </div>
    );
}

export default ProfilePage;