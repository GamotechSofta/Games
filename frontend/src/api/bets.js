import { API_BASE_URL } from '../config/api';
import { queryClient } from '../queryClient';
import { redirectToLoginIf401 } from '../utils/auth';
import { clearSessionCache, createSharedFetcher, getSessionCache, setSessionCache } from '../utils/sessionCache';
import {
  BET_HISTORY_DAYS,
  betHistoryCacheKey,
  gameRatesCacheKey,
  USER_DATA_CACHE_TTL_MS,
} from '../utils/userDataCache';
import { syncBetHistoryAfterPlace } from '../utils/betHistorySync';
import { invalidateBetHistoryCaches, markBetCancelledInStore } from '../utils/invalidateUserData';
import { fetchNoStore } from '../utils/fetchNoStore';
import { applyBalanceToStoredUser } from '../utils/walletBalance';

const runSharedRequest = createSharedFetcher();

/** MongoDB ObjectId is 24 hex characters */
const VALID_OBJECTID = /^[a-fA-F0-9]{24}$/;
function toObjectIdString(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'object' && v?.$oid) return String(v.$oid).trim() || null;
  try {
    const s = String(v).trim();
    return s || null;
  } catch {
    return null;
  }
}
function isValidObjectId(id) {
  const s = toObjectIdString(id);
  return s != null && VALID_OBJECTID.test(s);
}

/**
 * Update stored user balance in localStorage and notify app (e.g. header wallet).
 */
export function updateUserBalance(newBalance) {
  try {
    applyBalanceToStoredUser(newBalance);
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?.id || user?._id;
    if (userId) {
      const cacheKey = `wallet.balance.${userId}`;
      setSessionCache(cacheKey, { success: true, data: { balance: newBalance } }, 30 * 60 * 1000);
      queryClient.setQueryData(['walletBalance', userId], Number(newBalance));
    }
    window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: { balance: newBalance } }));
  } catch (_) {}
}

/**
 * Place bets for the current user.
 * @param {string} marketId - Market _id
 * @param {Array<{ betType: string, betNumber: string, amount: number }>} bets
 * @param {string} [scheduledDate] - Optional scheduled date for the bet (YYYY-MM-DD)
 * @returns {Promise<{ success: boolean, data?: { newBalance: number }, message?: string }>}
 */
export async function placeBet(marketId, bets, scheduledDate) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const rawUserId = user?.id || user?._id;
  if (!rawUserId) {
    return { success: false, message: 'Please log in to place a bet' };
  }
  const userId = toObjectIdString(rawUserId);
  if (!isValidObjectId(userId)) {
    return { success: false, message: 'Session invalid. Please log in again.' };
  }

  const normalizedMarketId = toObjectIdString(marketId ?? user?.marketId);
  if (!normalizedMarketId || !isValidObjectId(normalizedMarketId)) {
    return { success: false, message: 'This market is not available for betting. Please go back and select a market from the list.' };
  }

  const normalizeBetOn = (v) => {
    const s = String(v ?? '').trim().toLowerCase();
    if (!s) return undefined;
    if (s === 'open') return 'open';
    if (s === 'close' || s === 'closed') return 'close';
    if (s === 'openbet') return 'open';
    if (s === 'closebet') return 'close';
    // UI strings
    if (s === 'open') return 'open';
    if (s === 'close') return 'close';
    return undefined;
  };

  const payload = {
    userId,
    marketId: normalizedMarketId,
    bets: bets.map((b) => ({
      betType: b.betType,
      betNumber: String(b.betNumber).trim(),
      amount: Number(b.amount) || 0,
      // optional: session selection ('open' | 'close') for admin open/close views
      betOn: normalizeBetOn(b.betOn) || normalizeBetOn(b.session) || normalizeBetOn(b.type),
    })),
  };

  // Add scheduledDate if provided
  if (scheduledDate) {
    payload.scheduledDate = scheduledDate;
  }

  const response = await fetch(`${API_BASE_URL}/bets/place`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (redirectToLoginIf401(response)) {
    return { success: false, message: 'Session expired' };
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      success: false,
      message: data.message || 'Failed to place bet',
      code: data.code,
    };
  }
  if (data?.data?.newBalance != null) {
    updateUserBalance(data.data.newBalance);
  }
  if (data?.success) {
    syncBetHistoryAfterPlace({
      userId,
      bets: data?.data?.bets,
      betIds: data?.data?.betIds,
      marketId: normalizedMarketId,
      betsPayload: payload.bets,
      scheduledDate: scheduledDate || null,
    });
  }
  return data;
}

/**
 * Cancel a bet for the current user.
 * @param {string} betId - Bet _id to cancel
 * @returns {Promise<{ success: boolean, data?: { newBalance: number, refundedAmount: number }, message?: string, code?: string }>}
 */
export async function cancelBet(betId) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const rawUserId = user?.userId || user?.id || user?._id;
  if (!rawUserId) {
    return { success: false, message: 'Please log in to cancel a bet' };
  }
  const userId = toObjectIdString(rawUserId);
  if (!isValidObjectId(userId)) {
    return { success: false, message: 'Session invalid. Please log in again.' };
  }

  const normalizedBetId = toObjectIdString(betId);
  if (!normalizedBetId || !isValidObjectId(normalizedBetId)) {
    return { success: false, message: 'Invalid bet ID' };
  }

  const payload = {
    userId,
    betId: normalizedBetId,
  };

  const response = await fetch(`${API_BASE_URL}/bets/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to cancel bet', code: data.code };
  }
  if (data?.data?.newBalance != null) {
    updateUserBalance(data.data.newBalance);
  }
  if (data?.success) {
    invalidateBetHistoryCaches(userId);
    markBetCancelledInStore(normalizedBetId);
  }
  return data;
}

/**
 * Fetch current payout rates (single, jodi, singlePatti, etc.) for display.
 * Same rates used when settling wins (admin Update Rate screen).
 * @returns {Promise<{ success: boolean, data?: { single, jodi, singlePatti, ... }, message?: string }>}
 */
export async function getRatesCurrent({ force = false } = {}) {
  const cacheKey = gameRatesCacheKey();
  if (!force) {
    const cached = getSessionCache(cacheKey);
    if (cached) return cached;
  }

  return runSharedRequest(cacheKey, async () => {
    const response = await fetch(`${API_BASE_URL}/rates/current`);
    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to fetch rates' };
    }
    setSessionCache(cacheKey, data, USER_DATA_CACHE_TTL_MS);
    return data;
  });
}

/**
 * Fetch current wallet balance for the logged-in user.
 * @returns {Promise<{ success: boolean, data?: { balance: number }, message?: string }>}
 */
export async function getBalance({ force = false } = {}) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) {
    return { success: false, message: 'Please log in' };
  }

  const cacheKey = `wallet.balance.${userId}`;
  if (!force) {
    const cached = getSessionCache(cacheKey);
    if (cached) return cached;
  }

  return runSharedRequest(cacheKey, async () => {
    const response = await fetch(`${API_BASE_URL}/wallet/balance?userId=${encodeURIComponent(userId)}`);
    if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to fetch balance' };
    }
    setSessionCache(cacheKey, data, 30 * 60 * 1000);
    return data;
  });
}

/**
 * Fetch wallet transaction history for logged-in user.
 * @param {number} limit
 */
export async function getMyWalletTransactions(limit = 200) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) {
    return { success: false, message: 'Please log in' };
  }
  const url = `${API_BASE_URL}/wallet/my-transactions?userId=${encodeURIComponent(userId)}&limit=${encodeURIComponent(limit)}&includeBet=1`;
  const response = await fetch(url);
  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to fetch transactions' };
  }
  return data;
}

/**
 * Fetch bet history for logged-in user from database.
 * @param {{ days?: number, limit?: number }} [options]
 * @returns {Promise<{ success: boolean, data?: Array<Bet>, message?: string }>}
 */
export async function getMyBetHistory({ days = BET_HISTORY_DAYS, limit = 50, skip = 0, force = false } = {}) {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) {
    return { success: false, message: 'Please log in' };
  }

  const cacheKey = betHistoryCacheKey(userId, days, limit, skip);

  const fetchFromNetwork = async () => {
    const params = new URLSearchParams({
      userId,
      days: String(days),
      limit: String(limit),
      skip: String(skip),
    });
    const url = `${API_BASE_URL}/bets/my-history?${params.toString()}`;
    const response = await fetchNoStore(url);
    if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

    const data = await response.json();
    if (!response.ok) {
      return { success: false, message: data.message || 'Failed to fetch bet history' };
    }
    setSessionCache(cacheKey, data, USER_DATA_CACHE_TTL_MS);
    return data;
  };

  if (force) {
    clearSessionCache(cacheKey);
    return fetchFromNetwork();
  }

  const cached = getSessionCache(cacheKey);
  if (cached) return cached;

  return runSharedRequest(cacheKey, fetchFromNetwork);
}

export function clearMyBetHistoryCache() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userId = user?.id || user?._id;
    if (userId) invalidateBetHistoryCaches(userId);
  } catch {
    /* ignore */
  }
}
