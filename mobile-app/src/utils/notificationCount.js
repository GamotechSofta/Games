import { API_BASE_URL } from '../config/api';
import { storage } from './storage';
import { emit } from './events';

const NOTIFICATIONS_LAST_SEEN_KEY = 'notificationsLastSeenAt';
export const NOTIFICATIONS_CLEARED_AT_KEY = 'notificationsClearedAt';

export async function getNotificationsLastSeenAt() {
  try {
    const v = await storage.getItem(NOTIFICATIONS_LAST_SEEN_KEY);
    return v ? parseInt(v, 10) : 0;
  } catch {
    return 0;
  }
}

export async function markNotificationsSeen() {
  try {
    await storage.setItem(NOTIFICATIONS_LAST_SEEN_KEY, String(Date.now()));
    emit('notificationsSeen');
  } catch (_) {}
}

export async function getNotificationsClearedAt() {
  try {
    const v = await storage.getItem(NOTIFICATIONS_CLEARED_AT_KEY);
    return v ? parseInt(v, 10) : null;
  } catch {
    return null;
  }
}

export async function setNotificationsClearedAt(timestamp) {
  try {
    if (timestamp == null) await storage.removeItem(NOTIFICATIONS_CLEARED_AT_KEY);
    else await storage.setItem(NOTIFICATIONS_CLEARED_AT_KEY, String(timestamp));
    emit('notificationsCleared');
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

export async function getNotificationUnreadCount() {
  try {
    const userStr = await storage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    const userId = user?.id || user?._id;
    if (!userId) return 0;

    const lastSeenAt = await getNotificationsLastSeenAt();
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
      (Array.isArray(betsData?.data) ? betsData.data : []).map((b) => toMarketId(b.marketId)).filter(Boolean)
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
