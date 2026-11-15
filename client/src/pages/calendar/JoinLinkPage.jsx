import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { joinViaLink } from '../../services/calendarService.js';
import { useAuthContext } from '../../context/AuthContext.js';

function JoinLinkPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const { user, loading } = useAuthContext();
    const [message, setMessage] = useState('');
    const requestSent = useRef(false);

    useEffect(() => {
        if (loading) return;

        if (!user) {
            navigate('/login');
            return;
        }

        if (!token) return;
        requestSent.current = true;

        joinViaLink(token)
            .then((res) => setMessage(`You have successfully joined the calendar "${res.calendarName}"!`))
            .catch(err => {
                setMessage(err.response?.data?.message || 'Failed to join the calendar.');
            });
    }, [token, navigate, user, loading]);

    return (
        <div>
            <h2>{message}</h2>
            {message && (
                <button onClick={() => navigate('/calendar')}>Close</button>
            )}
        </div>
    );
}

export default JoinLinkPage;