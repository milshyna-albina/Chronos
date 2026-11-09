import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../../services/authService.js';
import { validateRegistrationForm } from '../../utils/validation.js';

function RegisterPage() {
    const [login, setLogin] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const validationError = validateRegistrationForm(login, email, password, passwordConfirmation);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            const result = await registerUser({
                login,
                email,
                password,
                password_confirmation: passwordConfirmation
            });

            if (result.userId) {
                navigate('/confirm-email', { state: { email } });
            } else {
                setError(result.message || 'Registration failed');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    return (
        <div className="auth-container">
            <h1>Create new account</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Login</label>
                    <input type="text" id="login" maxLength={30} value={login}
                           onChange={(e) => setLogin(e.target.value)} required />
                </div>

                <div>
                    <label>Email</label>
                    <input type="email" id="email" value={email}
                           onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                    <label>Password</label>
                    <input type="password" id="password" maxLength={50} value={password}
                           onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div>
                    <label>Confirm password</label>
                    <input type="password" id="passwordConfirmation" maxLength={50} value={passwordConfirmation}
                           onChange={(e) => setPasswordConfirmation(e.target.value)} required />
                </div>

                <button type="submit">Register</button>
            </form>

            {error && <p className="error-message">{error}</p>}

            <div className="auth-links">
                <Link to="/login">Already have an account? Login</Link>
            </div>

            <button onClick={() => window.history.back()}>Back</button>
        </div>
    );
}

export default RegisterPage;