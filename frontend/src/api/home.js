import { API_BASE_URL } from '../config/api';
import { getNotificationsLastSeenAt } from '../utils/notificationCount';

export async function fetchHomeBootstrap({ marketLimit = 24, gameLimit = 12 } = {}) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  const params = new URLSearchParams({
    marketLimit: String(marketLimit),
    gameLimit: String(gameLimit),
  });
  if (userId) {
    params.set('userId', String(userId));
    params.set('lastSeenAt', String(getNotificationsLastSeenAt() || 0));
  }

  const res = await fetch(`${API_BASE_URL}/home/bootstrap?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load home bootstrap');
  }
  return data?.data || { markets: [], games: [], wallet: null, notifications: null };
}

