const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';

const TOKEN_KEY = 'adminToken';

export const getAdminAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const clearAdminAuth = () => {
    localStorage.removeItem('admin');
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('adminPassword');
    sessionStorage.removeItem('adminPassword');
};

/** Fetch with auth headers; on 401 (expired token) clears auth and redirects to login */
export async function adminFetch(url, options = {}) {
    const headers = { ...getAdminAuthHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        clearAdminAuth();
        window.location.href = '/';
    }
    return res;
}

export { API_BASE_URL };
