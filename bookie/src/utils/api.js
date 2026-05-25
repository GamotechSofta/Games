const DEV_API_BASE_URL = 'http://localhost:3010/api/v1';
const DEV_FRONTEND_URL = 'http://localhost:5173';

function resolveEnvUrl(value, devFallback) {
    const normalized = String(value || '').trim().replace(/\/$/, '');
    if (normalized) return normalized;
    return import.meta.env.DEV ? devFallback : '';
}

const API_CONFIG_ERROR = 'App configuration error: VITE_API_BASE_URL is missing for this build.';
const API_BASE_URL = resolveEnvUrl(import.meta.env.VITE_API_BASE_URL, DEV_API_BASE_URL);
const FRONTEND_URL = resolveEnvUrl(import.meta.env.VITE_FRONTEND_URL, DEV_FRONTEND_URL);
const API_ORIGIN = API_BASE_URL ? API_BASE_URL.replace(/\/api\/v1\/?$/, '') : '';

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

export const buildApiUrl = (path = '') => {
    if (!API_BASE_URL) {
        throw new Error(API_CONFIG_ERROR);
    }

    if (!path) return API_BASE_URL;

    return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

/** Fetch with auth headers; on 401 (expired token) clears auth and redirects to login */
export async function bookieFetch(url, options = {}) {
    if (!API_BASE_URL && typeof url === 'string' && url.startsWith('/')) {
        throw new Error(API_CONFIG_ERROR);
    }

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

export { API_BASE_URL, API_CONFIG_ERROR, API_ORIGIN, FRONTEND_URL };
