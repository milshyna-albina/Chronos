import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCalendarsWithEvents, respondToInvite } from '../../services/calendarService.js';
import { useAuthContext } from '../../context/AuthContext.js';

function InvitePage() {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetId = searchParams.get('id');

    const [invite, setInvite] = useState(null);
    const [error, setError] = useState('');

    const fetchInvite = useCallback(() => {
        getCalendarsWithEvents('', '')
            .then(data => {
                const invite = data.shared.find(cal => {
                    const member = cal.sharedWith?.find(m =>
                        String(m.user?.id) === String(user.id)
                    );
                    return String(cal.id) === String(targetId) && member?.status === 'pending';
                });

                if (invite) {
                    setInvite(invite);
                } else {
                    navigate('/calendar');
                }
            })
            .catch(() => setError('Failed to load invites'));
    }, [user, navigate, targetId]);

    useEffect(() => {
        if (user && targetId) {
            fetchInvite();
        } else if (user && !targetId) {
            navigate('/calendar');
        }
    }, [fetchInvite, user, targetId, navigate]);

    const handleResponse = async (calendarId, action) => {
        setError('');

        try {
            await respondToInvite(calendarId, action);
            navigate('/calendar');
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    return (
        <div>
            {invite && (
                <div>
                    <p>You have been invited to join {invite.name} by {invite.owner?.login}.</p>
                    <button type="button" onClick={() => handleResponse(invite.id, 'accept')}>Accept</button>
                    <button type="button" onClick={() => handleResponse(invite.id, 'decline')}>Decline</button>
                </div>
            )}

            {error && <p>{error}</p>}
        </div>
    );
}

export default InvitePage;