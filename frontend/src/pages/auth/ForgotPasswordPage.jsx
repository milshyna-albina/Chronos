import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService.js';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const result = await forgotPassword(email);

            if (result.message) {
                setMessage('Check your email for the password reset link.');
            } else {
                setError('Failed to request password reset.');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    return (
        <div className="auth-container">
            <h1>Reset password</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>Email</label>
                    <input type="email" id="email" value={email}
                           onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <button type="submit">Reset</button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="auth-links">
                <Link to="/login">Back to login</Link>
            </div>
        </div>
    );
}

export default ForgotPasswordPage;