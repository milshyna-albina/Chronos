import { useState, useEffect } from 'react';
import { useAuthContext } from './AuthContext.js';
import { NotificationContext } from './NotificationContext.js';

export const NotificationProvider = ({ children }) => {
    const { user } = useAuthContext();
    const [notifications, setNotifications] = useState([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const eventSource = new EventSource('http://localhost:5001/api/notifications/stream', { withCredentials: true });

        eventSource.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                const newNotification = {
                    id: crypto.randomUUID(),
                    type: data.type,
                    message: data.message,
                    event: data.event,
                    receivedAt: new Date().toISOString()
                };

                setNotifications(prev => [newNotification, ...prev]);
            } catch (err) {
                console.error('Failed to parse notification:', err);
            }
        };

        eventSource.onerror = (err) => {
            console.error('SSE connection error:', err);
        };

        return () => {
            eventSource.close();
        };
    }, [user]);

    const removeNotification = (id) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const clearNotifications = () => {
        setNotifications([]);
    };

    return (
        <NotificationContext.Provider value={{ notifications, removeNotification, clearNotifications }}>
            {children}
        </NotificationContext.Provider>
    );
};