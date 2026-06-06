import { API_BASE_URL, fetchWithAuth } from './api';

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

export function computeIsOnline(user, nowMs = Date.now()) {
    const lastActive = user?.lastActiveAt ? new Date(user.lastActiveAt).getTime() : 0;
    return lastActive > 0 && nowMs - lastActive < ONLINE_THRESHOLD_MS;
}

const EMPTY_STATS = {
    total: 0,
    online: 0,
    withDeposit: 0,
    withWithdrawal: 0,
    withWalletCredit: 0,
    withBet: 0,
};

const EMPTY_PAGINATION = { page: 1, limit: 50, total: 0, totalPages: 1 };

export async function loadTelecallerDashboard({
    search = '',
    page = 1,
    limit = 50,
    sort = 'last_deposit_desc',
} = {}) {
    const params = new URLSearchParams();
    const q = String(search || '').trim();
    if (q) params.set('search', q);
    if (page > 1) params.set('page', String(page));
    if (limit !== 50) params.set('limit', String(limit));
    if (sort && sort !== 'last_deposit_desc') params.set('sort', sort);

    const url = `${API_BASE_URL}/telecaller/dashboard${params.toString() ? `?${params}` : ''}`;
    const res = await fetchWithAuth(url);
    const json = await res.json();
    if (!json.success) {
        throw new Error(json.message || 'Failed to load dashboard');
    }
    return {
        players: json.data || [],
        pagination: json.pagination || EMPTY_PAGINATION,
        stats: json.stats || EMPTY_STATS,
        onlinePreview: json.onlinePreview || [],
    };
}

export { ONLINE_THRESHOLD_MS };
