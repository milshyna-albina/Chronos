import { useAuthContext } from '../context/AuthContext.js';

function CalendarPage() {
    const { logout } = useAuthContext();

    return (
        <div>
            <h1>Calendar</h1>
            <button onClick={logout}>Log out</button>
        </div>
    );
}

export default CalendarPage;