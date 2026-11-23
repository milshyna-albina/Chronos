import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext.js';
import { getAvatarUrl } from '../../utils/avatar.js';
import CalendarGrid from '../../components/calendar/CalendarGrid.jsx';
import TagForm from '../../components/tag/TagForm.jsx';
import EventSearch from '../../components/event/EventSearch.jsx';

function CalendarPage() {
    const { logout, user } = useAuthContext();
    const navigate = useNavigate();
    const [showTagForm, setShowTagForm] = useState(false);
    const [searchedEvent, setSearchedEvent] = useState(null);

    return (
        <div>
            <h1>Calendar</h1>

            <EventSearch onSelectEvent={(event) => setSearchedEvent({ data: event, key: Date.now() })}/>
            <br/>
            {user && (
                <div>
                    <img className="avatar" src={getAvatarUrl(user.avatarPath)} alt="Avatar" width="100" height="100"/>
                    <p>{user.login}</p>
                    <p>{user.email}</p>
                </div>
            )}

            <button onClick={() => navigate('/profile')}>Profile settings</button>
            <button onClick={logout}>Log out</button>

            <br/><br/>
            <CalendarGrid searchedEvent={searchedEvent} />
            <br/>
            {showTagForm ? (
                <TagForm onClose={() => setShowTagForm(false)} />
            ) : (
                <button onClick={() => setShowTagForm(true)}>Tags</button>
            )}
        </div>
    );
}

export default CalendarPage;