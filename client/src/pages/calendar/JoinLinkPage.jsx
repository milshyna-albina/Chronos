import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { joinCalendarViaLink } from '../../services/calendarService.js';
import { joinEventViaLink } from '../../services/eventService.js';
import { useAuthContext } from '../../context/AuthContext.js';

function JoinLinkPage({ type }) {
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

        if (!token || requestSent.current) return;
        requestSent.current = true;

        const joinFunction = type === 'event' ? joinEventViaLink : joinCalendarViaLink;
        joinFunction(token)
            .then((res) => {
                const itemType = type === 'event' ? 'event' : 'calendar';
                const itemName = type === 'event' ? res.eventName : res.calendarName;
                setMessage(`You have successfully joined the ${itemType} "${itemName}"!`);
            })
            .catch(err => {
                setMessage(err.response?.data?.message || 'Failed to join.');
            });
    }, [token, navigate, user, loading, type]);

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