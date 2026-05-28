import { API_BASE_URL } from '../config/api';

let homeBootstrapUnavailable = false;

export async function fetchHomeBootstrap({ marketLimit = 24, gameLimit = 12 } = {}) {
  if (homeBootstrapUnavailable) {
    const err = new Error('HOME_BOOTSTRAP_UNAVAILABLE');
    err.code = 'HOME_BOOTSTRAP_UNAVAILABLE';
    throw err;
  }

  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  const params = new URLSearchParams({
    marketLimit: String(marketLimit),
    gameLimit: String(gameLimit),
  });
  if (userId) {
    params.set('userId', String(userId));
  }

  const res = await fetch(`${API_BASE_URL}/home/bootstrap?${params.toString()}`);
  const data = await res.json().catch(() => null);
  if (res.status === 404) {
    homeBootstrapUnavailable = true;
    const err = new Error('HOME_BOOTSTRAP_UNAVAILABLE');
    err.code = 'HOME_BOOTSTRAP_UNAVAILABLE';
    throw err;
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load home bootstrap');
  }
  return data?.data || { markets: [], games: [], wallet: null };
}

