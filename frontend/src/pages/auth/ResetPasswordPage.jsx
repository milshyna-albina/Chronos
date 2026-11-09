import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../../services/authService.js';
import { validatePassword } from '../../utils/validation.js';

function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const [password, setPassword] = useState('');
    const [passwordConfirmation, setPasswordConfirmation] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!token) {
            setError('Invalid or missing token.');
            return;
        }

        const validationError = validatePassword(password, passwordConfirmation);
        if (validationError) {
            setError(validationError);
            return;
        }

        try {
            const result = await resetPassword(token, password);

            if (result.message) {
                navigate('/login');
            } else {
                setError('Failed to reset password.');
            }
        } catch (error) {
            setError(error.response?.data?.message || 'Server error');
        }
    };

    return (
        <div className="auth-container">
            <h1>Create new password</h1>

            <form onSubmit={handleSubmit}>
                <div>
                    <label>New password</label>
                    <input type="password" id="password" maxLength={50} value={password}
                           onChange={(e) => setPassword(e.target.value)} required />
                </div>

                <div>
                    <label>Confirm password</label>
                    <input type="password" id="passwordConfirmation" maxLength={50} value={passwordConfirmation}
                           onChange={(e) => setPasswordConfirmation(e.target.value)} required />
                </div>

                <button type="submit">Save</button>
            </form>

            {error && <p className="error-message">{error}</p>}

            <div className="auth-links">
                <Link to="/login">Back to login</Link>
            </div>
        </div>
    );
}

export default ResetPasswordPage;