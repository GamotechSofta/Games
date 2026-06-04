import React, { createContext, useContext, useState, useEffect } from 'react';
import { AUTH_KEY, TOKEN_KEY, getStoredSession, saveSession, clearSession } from '../utils/api';

const AuthContext = createContext(null);

const ALLOWED_ROLES = new Set(['super_admin', 'specific_admin', 'telecaller']);

export function AuthProvider({ children }) {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = getStoredSession();
        if (stored?.token && ALLOWED_ROLES.has(stored.role)) {
            setSession(stored);
        } else if (stored) {
            clearSession();
        }
        setLoading(false);

        const onStorage = (e) => {
            if (e.key === AUTH_KEY || e.key === TOKEN_KEY) {
                const next = getStoredSession();
                setSession(next?.token && ALLOWED_ROLES.has(next.role) ? next : null);
            }
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const login = (data) => {
        saveSession(data);
        setSession({ ...data });
    };

    const logout = () => {
        clearSession();
        setSession(null);
    };

    return (
        <AuthContext.Provider value={{ session, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
