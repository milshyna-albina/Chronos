import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser  } from '../../services/authService.js';
import { useAuthContext } from '../../context/AuthContext.js';

function LoginPage() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const { login } = useAuthContext();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            const result = await loginUser({ identifier, password });

            if (result.user) {
                login(result.user);
                navigate('/calendar');
            } else {
                setError(result.message || 'Login failed');
            }
        } catch (error) {
            const errorMessage = error.response?.data?.message || 'Server error';
            setError(errorMessage);
            if (errorMessage === 'Please confirm your email first.') {
                if (error.response?.data?.email) {
                    setUserEmail(error.response?.data?.email);
                }
            }
        }
    };

    const navigateConfirmEmail = () => {
        navigate('/confirm-email', { state: { email: userEmail } });
    };

    return (
        <div className="auth-container">
            <h1>Login</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Login or email</label>
                    <input type="text" id="identifier" maxLength={30} value={identifier}
                           onChange={(e) => setIdentifier(e.target.value)} required />
                </div>

                <div>
                    <label>Password</label>
                    <input type="password" id="password" maxLength={50} value={password}
                           onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <button type="submit">Log in</button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {userEmail && (<button type="button" onClick={navigateConfirmEmail}>Confirm</button>)}

            <div className="auth-links">
                <Link to="/forgot-password">Forgot password?</Link>
                <br/>
                <Link to="/register">Don't have an account? Register</Link>
            </div>

            <button onClick={() => window.history.back()}>Back</button>
        </div>
    );
}

export default LoginPage;