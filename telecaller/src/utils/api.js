const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL
    || (import.meta.env.DEV ? '/api/v1' : 'http://localhost:3010/api/v1');

const AUTH_KEY = 'telecaller';
const TOKEN_KEY = 'telecallerToken';

export function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
}

export function getStoredSession() {
    try {
        const raw = localStorage.getItem(AUTH_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function saveSession(data) {
    const { token, ...rest } = data;
    localStorage.setItem(AUTH_KEY, JSON.stringify({ ...rest, token }));
    if (token) localStorage.setItem(TOKEN_KEY, token);
}

export function clearSession() {
    localStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(TOKEN_KEY);
}

export async function fetchWithAuth(url, options = {}) {
    const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
    const res = await fetch(url, { ...options, headers });
    if (res.status === 401) {
        clearSession();
        window.location.href = '/';
    }
    return res;
}

export { API_BASE_URL, AUTH_KEY, TOKEN_KEY };
