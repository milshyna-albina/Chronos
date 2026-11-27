import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../../services/authService.js';

function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);

    useEffect(() => {
        if (cooldown <= 0) return;

        const timer = setTimeout(() => {
            setCooldown(prev => prev - 1);
        }, 1000);

        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (cooldown > 0) return;
        setError('');
        setMessage('');

        try {
            const result = await forgotPassword(email);

            if (result.message) {
                setMessage('Check your email for the password reset link.');
                setCooldown(result.retryAfter || 60);
            } else {
                setError('Failed to request password reset.');
            }
        } catch (error) {
            const retryAfter = error.response?.data?.retryAfter;
            if (error.response?.status === 429 && retryAfter) {
                setCooldown(retryAfter);
                return;
            }
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

                <button type="submit" disabled={cooldown > 0}>
                    {cooldown > 0 ? `Reset (${cooldown}s)` : 'Reset'}
                </button>
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