import { createContext, useContext } from 'react';

export const NotificationContext = createContext(null);
export const useNotificationContext = () => useContext(NotificationContext);