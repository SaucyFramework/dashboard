import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { get, post } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [authenticated, setAuthenticated] = useState(null);
    const [passwordRequired, setPasswordRequired] = useState(false);
    const [loading, setLoading] = useState(true);

    const check = useCallback(async () => {
        try {
            const data = await get('/auth/check');
            setAuthenticated(data.authenticated);
            setPasswordRequired(data.password_required);
        } catch {
            setAuthenticated(false);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        check();
    }, [check]);

    useEffect(() => {
        const handler = () => {
            setAuthenticated(false);
        };
        window.addEventListener('saucy:unauthenticated', handler);
        return () => window.removeEventListener('saucy:unauthenticated', handler);
    }, []);

    const login = useCallback(async (password) => {
        const data = await post('/auth/login', { password });
        if (data.authenticated) {
            setAuthenticated(true);
            return { success: true };
        }
        return { success: false, error: data.error || 'Login failed' };
    }, []);

    const logout = useCallback(async () => {
        await post('/auth/logout');
        setAuthenticated(false);
    }, []);

    return (
        <AuthContext.Provider value={{ authenticated, passwordRequired, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
