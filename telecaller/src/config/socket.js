/** Socket.IO server origin (no /api/v1 path). */
export function getSocketUrl() {
    const raw = import.meta.env.VITE_SOCKET_URL;
    if (raw && String(raw).trim()) {
        return String(raw).replace(/\/$/, '');
    }
    const api = import.meta.env.VITE_API_BASE_URL || '';
    if (api.startsWith('/')) {
        return typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5177';
    }
    const backend = import.meta.env.VITE_BACKEND_BASE_URL
        || String(api).replace(/\/api\/v1\/?$/, '')
        || 'http://localhost:3010';
    return String(backend).replace(/\/$/, '');
}
