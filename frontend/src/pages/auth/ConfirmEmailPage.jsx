import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { confirmEmail, resendCode } from '../../services/authService.js';

function ConfirmEmailPage() {
    const [code, setCode] = useState('');
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const email = location.state?.email;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        try {
            const result = await confirmEmail(code);

            if (result.message) {
                navigate('/login');
            } else {
                setError('Invalid confirmation code.');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    const handleResend = async () => {
        setError('');
        setMessage('');

        if (!email) {
            setError('Email not found.');
            return;
        }

        try {
            const result = await resendCode(email);

            if (result.message) {
                setMessage('A new confirmation code has been sent.');
            } else {
                setError('Failed to resend confirmation code.');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    return (
        <div className="auth-container">
            <h1>Confirm email</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <input type="text" id="code" value={code} onChange={(e) => setCode(e.target.value)} required />
                </div>

                <button type="submit">Confirm</button>
                <br/>
                <button type="button" onClick={handleResend}>Resend code</button>
            </form>

            {error && <p className="error-message">{error}</p>}
            {message && <p className="success-message">{message}</p>}

            <div className="auth-links">
                <Link to="/login">Back to login</Link>
            </div>
        </div>
    );
}

export default ConfirmEmailPage;