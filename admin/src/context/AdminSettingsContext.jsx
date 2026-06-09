import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminFetch, API_BASE_URL } from '../utils/api';

export const ADMIN_AUTH_UPDATED_EVENT = 'admin-auth-updated';

const AdminSettingsContext = createContext({
    hasSecretDeclarePassword: false,
    setHasSecretDeclarePassword: () => {},
    refreshSecretDeclarePasswordStatus: async () => {},
});

export function AdminSettingsProvider({ children }) {
    const [hasSecretDeclarePassword, setHasSecretDeclarePassword] = useState(false);

    const refreshSecretDeclarePasswordStatus = useCallback(async () => {
        const token = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
        if (!token) {
            setHasSecretDeclarePassword(false);
            return;
        }
        try {
            const res = await adminFetch(`${API_BASE_URL}/admin/me/secret-declare-password-status`);
            const json = await res.json();
            if (json.success) {
                setHasSecretDeclarePassword(!!json.hasSecretDeclarePassword);
            }
        } catch {
            setHasSecretDeclarePassword(false);
        }
    }, []);

    useEffect(() => {
        refreshSecretDeclarePasswordStatus();

        const onAuthUpdated = () => {
            refreshSecretDeclarePasswordStatus();
        };
        window.addEventListener(ADMIN_AUTH_UPDATED_EVENT, onAuthUpdated);
        return () => window.removeEventListener(ADMIN_AUTH_UPDATED_EVENT, onAuthUpdated);
    }, [refreshSecretDeclarePasswordStatus]);

    return (
        <AdminSettingsContext.Provider
            value={{
                hasSecretDeclarePassword,
                setHasSecretDeclarePassword,
                refreshSecretDeclarePasswordStatus,
            }}
        >
            {children}
        </AdminSettingsContext.Provider>
    );
}

export function useAdminSettings() {
    return useContext(AdminSettingsContext);
}
