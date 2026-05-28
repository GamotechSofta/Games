import { API_BASE_URL } from '../config/api';
import { createSharedFetcher, getSessionCache, setSessionCache, clearSessionCache } from './sessionCache';

const NOTIFICATIONS_LAST_SEEN_KEY = 'notificationsLastSeenAt';
export const NOTIFICATIONS_CLEARED_AT_KEY = 'notificationsClearedAt';
const NOTIFICATION_COUNT_CACHE_KEY = 'header.notificationCount.v1';
const NOTIFICATION_COUNT_TTL_MS = 2 * 60 * 1000;
const runSharedRequest = createSharedFetcher();
let unreadCountEndpointUnavailable = false;

export function getNotificationsLastSeenAt() {
  try {
    const v = localStorage.getItem(NOTIFICATIONS_LAST_SEEN_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

export function markNotificationsSeen() {
  try {
    localStorage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(Date.now()));
    clearNotificationCountCache();
    window.dispatchEvent(new CustomEvent('notificationsSeen'));
  } catch (_) {}
}

export function clearNotificationCountCache() {
  clearSessionCache(NOTIFICATION_COUNT_CACHE_KEY);
}

/** Instant badge value from cache (no network). */
export function getCachedNotificationUnreadCount() {
  const cached = getSessionCache(NOTIFICATION_COUNT_CACHE_KEY);
  return typeof cached === 'number' ? cached : 0;
}

/** Cleared-at timestamp (when user tapped "Clear all"). Persisted so mobile/desktop and tabs stay in sync. */
export function getNotificationsClearedAt() {
  try {
    const v = localStorage.getItem(NOTIFICATIONS_CLEARED_AT_KEY);
    return v ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}

export function setNotificationsClearedAt(timestamp) {
  try {
    if (timestamp == null) localStorage.removeItem(NOTIFICATIONS_CLEARED_AT_KEY);
    else localStorage.setItem(NOTIFICATIONS_CLEARED_AT_KEY, String(timestamp));
    window.dispatchEvent(new CustomEvent('notificationsCleared'));
  } catch (_) {}
}

const toDateKeyIST = (d) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(d);
  } catch {
    return '';
  }
};

/** Single lightweight endpoint (preferred). */
async function fetchUnreadCountFromApi(userId, lastSeenAt) {
  if (unreadCountEndpointUnavailable) {
    throw new Error('NOTIFICATION_UNREAD_ENDPOINT_UNAVAILABLE');
  }
  const params = new URLSearchParams({
    userId: String(userId),
    lastSeenAt: String(lastSeenAt || 0),
  });
  const res = await fetch(`${API_BASE_URL}/notifications/unread-count?${params.toString()}`);
  if (res.status === 404) {
    unreadCountEndpointUnavailable = true;
    throw new Error('NOTIFICATION_UNREAD_ENDPOINT_UNAVAILABLE');
  }
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to fetch notification count');
  }
  return typeof data?.data?.count === 'number' ? data.data.count : 0;
}

/** Legacy fallback if unified endpoint is unavailable. */
async function fetchNotificationUnreadCountLegacy() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id || user?._id;
    if (!userId) return 0;

    const lastSeenAt = getNotificationsLastSeenAt();
    const now = new Date();
    const todayKey = toDateKeyIST(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayKey = toDateKeyIST(yesterday);

    const [depRes, withRes, ticketsRes, betsRes, resultTodayRes, resultYesterdayRes] = await Promise.all([
      fetch(`${API_BASE_URL}/payments/my-deposits?userId=${userId}`),
      fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${userId}`),
      fetch(`${API_BASE_URL}/help-desk/my-tickets?userId=${encodeURIComponent(userId)}`),
      fetch(`${API_BASE_URL}/bets/my-history?userId=${encodeURIComponent(userId)}`),
      fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(todayKey)}`),
      fetch(`${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(yesterdayKey)}`),
    ]);

    const depData = await depRes.json();
    const withData = await withRes.json();
    const ticketsData = await ticketsRes.json();
    const betsData = await betsRes.json();
    const resultTodayData = await resultTodayRes.json();
    const resultYesterdayData = await resultYesterdayRes.json();

    const toMarketId = (v) => (v == null ? '' : String(v && typeof v === 'object' && v._id != null ? v._id : v));
    const betMarketIds = new Set(
      (Array.isArray(betsData?.data) ? betsData.data : []).map((b) => toMarketId(b.marketId)).filter(Boolean),
    );
    const resultArray = (data) => (Array.isArray(data?.data) ? data.data : []);

    const list = [];

    (depData?.data || []).slice(0, 25).forEach((d) => {
      list.push({ time: d.processedAt || d.updatedAt || d.createdAt });
    });
    (withData?.data || []).slice(0, 25).forEach((w) => {
      list.push({ time: w.processedAt || w.updatedAt || w.createdAt });
    });
    (ticketsData?.data || []).slice(0, 20).forEach((t) => {
      list.push({ time: t.updatedAt || t.createdAt });
    });
    const addResultTimes = (resultData, dateKey) => {
      const timeForSort = new Date(`${dateKey}T23:59:59+05:30`).toISOString();
      resultArray(resultData).forEach((r) => {
        const marketIdStr = toMarketId(r.marketId);
        if (!marketIdStr || !betMarketIds.has(marketIdStr)) return;
        const name = (r.marketName || '').toString().trim();
        if (name) list.push({ time: r.updatedAt || r.createdAt || timeForSort, dateKey, type: 'result' });
      });
    };
    addResultTimes(resultTodayData, todayKey);
    addResultTimes(resultYesterdayData, yesterdayKey);

    const lastSeen = new Date(lastSeenAt).getTime();
    const effectiveTime = (item) => {
      if (item.type === 'result' && item.dateKey) {
        try {
          return new Date(`${item.dateKey}T00:00:00+05:30`).getTime();
        } catch {
          return new Date(item.time || 0).getTime();
        }
      }
      return new Date(item.time || 0).getTime();
    };
    return list.filter((item) => effectiveTime(item) > lastSeen).length;
  } catch {
    return 0;
  }
}

async function fetchNotificationUnreadCount() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id || user?._id;
    if (!userId) return 0;

    const lastSeenAt = getNotificationsLastSeenAt();
    try {
      return await fetchUnreadCountFromApi(userId, lastSeenAt);
    } catch {
      return fetchNotificationUnreadCountLegacy();
    }
  } catch {
    return 0;
  }
}

/**
 * Fetches notification badge count (1 API call when backend supports /notifications/unread-count).
 */
export async function getNotificationUnreadCount({ force = false } = {}) {
  if (!force) {
    const cached = getSessionCache(NOTIFICATION_COUNT_CACHE_KEY);
    if (typeof cached === 'number') return cached;
  }

  return runSharedRequest(NOTIFICATION_COUNT_CACHE_KEY, async () => {
    const count = await fetchNotificationUnreadCount();
    setSessionCache(NOTIFICATION_COUNT_CACHE_KEY, count, NOTIFICATION_COUNT_TTL_MS);
    return count;
  });
}
