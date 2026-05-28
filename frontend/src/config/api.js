import { clearUserAuth } from '../utils/auth';

// API Configuration – set VITE_API_BASE_URL in Render (or .env) for production.
// Local dev: VITE_API_BASE_URL=/api/v1 + Vite proxy (vite.config.js) avoids CORS.
const _api =
  import.meta.env.VITE_API_BASE_URL ||
  (import.meta.env.DEV ? 'http://localhost:3010/api/v1' : '');

export const API_BASE_URL = _api || 'http://localhost:3010/api/v1';

const isRelativeApi = typeof _api === 'string' && _api.startsWith('/');

export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_BASE_URL ||
  (isRelativeApi
    ? import.meta.env.VITE_DEV_PROXY_TARGET?.replace(/\/$/, '') || 'http://localhost:3010'
    : String(API_BASE_URL).replace(/\/api\/v1\/?$/, ''));

/**
 * Origin for Socket.IO (no /api/v1 path).
 * Override with VITE_SOCKET_URL. Relative API uses current origin (Vite proxies /socket.io).
 */
export function getSocketUrl() {
  const raw = import.meta.env.VITE_SOCKET_URL;
  if (raw && String(raw).trim()) {
    return String(raw).replace(/\/$/, '');
  }
  if (isRelativeApi && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return String(BACKEND_BASE_URL || '').replace(/\/$/, '');
}

export function getAuthHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const token = user?.token;
    if (!token || token === 'cookie-auth') return {};
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

export async function fetchWithAuth(url, options = {}) {
  const headers = { ...getAuthHeaders(), ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  if (res.status === 401) {
    clearUserAuth();
  }
  return res;
}
