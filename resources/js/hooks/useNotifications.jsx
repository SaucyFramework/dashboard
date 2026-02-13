import { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext(null);

let nextId = 0;

export function NotificationProvider({ children }) {
    const [notifications, setNotifications] = useState([]);

    const notify = useCallback((message) => {
        const id = ++nextId;
        setNotifications((prev) => [...prev, { id, message }]);
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 2500);
    }, []);

    const dismiss = useCallback((id) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{ notifications, notify, dismiss }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    return useContext(NotificationContext);
}
