import { API_BASE_URL, fetchWithAuth } from './api';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function computeIsOnline(user, nowMs = Date.now()) {
    const lastActive = user?.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    return lastActive > 0 && nowMs - lastActive < ONLINE_THRESHOLD_MS;
}

export async function loadTelecallerDashboard(search = '') {
    const params = new URLSearchParams();
    const q = String(search || '').trim();
    if (q) params.set('search', q);

    const url = `${API_BASE_URL}/telecaller/dashboard${params.toString() ? `?${params}` : ''}`;
    const res = await fetchWithAuth(url);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message || 'Failed to load dashboard');
    }
    return json.data || [];
}

export { ONLINE_THRESHOLD_MS };
