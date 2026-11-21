import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCalendarsWithEvents, respondToInvite } from '../../services/calendarService.js';
import { respondToEventInvite } from '../../services/eventService.js';
import { useAuthContext } from '../../context/AuthContext.js';

function InvitePage({ type }) {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const targetId = searchParams.get('id');

    const [invite, setInvite] = useState(null);
    const [error, setError] = useState('');

    const fetchInvite = useCallback(() => {
        getCalendarsWithEvents('', '')
            .then(data => {
                let invite = null;
                if (type === 'event') {
                    const eventsList = data.pendingEvents || data.invitedEvents || [];
                    invite = eventsList.find(ev => {
                        const participant = ev.participants?.find(p =>
                            String(p.user?.id || p.user) === String(user.id)
                        );
                        return String(ev.id) === String(targetId) && participant?.status === 'pending';
                    });
                } else {
                    const calendarsList = data.pendingCalendars || data.shared || [];
                    invite = calendarsList.find(cal => {
                        const member = cal.sharedWith?.find(m =>
                            String(m.user?.id || m.user) === String(user.id)
                        );
                        return String(cal.id) === String(targetId) && member?.status === 'pending';
                    });
                }

                if (invite) {
                    setInvite(invite);
                } else {
                    navigate('/calendar');
                }
            })
            .catch(() => setError('Failed to load invites'));
    }, [user, navigate, targetId, type]);

    useEffect(() => {
        if (user && targetId) {
            fetchInvite();
        } else if (user && !targetId) {
            navigate('/calendar');
        }
    }, [fetchInvite, user, targetId, navigate]);

    const handleResponse = async (action) => {
        setError('');

        try {
            if (type === 'event') {
                const calendarId = invite.calendarId?.id || invite.calendarId;
                await respondToEventInvite(calendarId, invite.id, action);
            } else {
                await respondToInvite(invite.id, action);
            }
            navigate('/calendar');
        } catch (err) {
            setError(err.response?.data?.message || 'Server error');
        }
    };

    return (
        <div>
            {invite && (
                <div>
                    <p>You have been invited to join {invite.name} by {type === 'event' ? invite?.createdBy?.login : invite?.owner?.login}.</p>
                    <button type="button" onClick={() => handleResponse('accept')}>Accept</button>
                    <button type="button" onClick={() => handleResponse('decline')}>Decline</button>
                </div>
            )}

            {error && <p>{error}</p>}
        </div>
    );
}

export default InvitePage;