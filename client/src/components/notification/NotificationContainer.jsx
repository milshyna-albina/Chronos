import { useNotificationContext } from '../../context/NotificationContext.js';

function NotificationContainer() {
    const { notifications, removeNotification, clearNotifications } = useNotificationContext();
    if (notifications.length === 0) {
        return null;
    }

    return (
        <div>
            {notifications.length > 1 && (
                <button type="button" onClick={clearNotifications}>Clear all</button>
            )}

            {notifications.map((item) => (
                <div key={item.id}>
                    <div>
                        {item.message}
                        {item.event?.startDate && (<p>Start: {new Date(item.event.startDate).toLocaleString()}</p>)}
                    </div>
                    <button type="button" onClick={() => removeNotification(item.id)}>Close</button>
                </div>
            ))}
        </div>
    );
}

export default NotificationContainer;