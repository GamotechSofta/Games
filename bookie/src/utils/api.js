const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3010/api/v1';
const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

const TOKEN_KEY = 'bookieToken';

export const getBookieAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || '';
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
};

export const clearBookieAuth = () => {
    localStorage.removeItem('bookie');
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('bookiePassword');
    sessionStorage.removeItem('bookiePassword');
};

/** Fetch with auth headers; on 401 (expired token) clears auth and redirects to login */
export async function bookieFetch(url, options = {}) {
    const headers = { ...getBookieAuthHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        clearBookieAuth();
        window.location.href = '/';
    }
    return res;
}

export const getReferralUrl = (bookieId) => {
    return `${FRONTEND_URL}/login?ref=${bookieId}`;
};

export { API_BASE_URL, FRONTEND_URL };
