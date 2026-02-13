import { API_BASE_URL } from '../config/api';
import { redirectToLoginIf401 } from '../utils/auth';

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
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    user.balance = newBalance;
    localStorage.setItem('user', JSON.stringify(user));
    window.dispatchEvent(new Event('userLogin'));
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

  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to place bet' };
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
  const rawUserId = user?.id || user?._id;
  if (!rawUserId) {
    return { success: false, message: 'Please log in to cancel a bet' };
  }
  const userId = toObjectIdString(rawUserId);
  if (!isValidObjectId(userId)) {
    return { success: false, message: 'Session invalid. Please log in again.' };
  }

  if (!betId || !isValidObjectId(betId)) {
    return { success: false, message: 'Invalid bet ID' };
  }

  const payload = {
    userId,
    betId,
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
  return data;
}

/**
 * Fetch current payout rates (single, jodi, singlePatti, etc.) for display.
 * Same rates used when settling wins (admin Update Rate screen).
 * @returns {Promise<{ success: boolean, data?: { single, jodi, singlePatti, ... }, message?: string }>}
 */
export async function getRatesCurrent() {
  const response = await fetch(`${API_BASE_URL}/rates/current`);
  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to fetch rates' };
  }
  return data;
}

/**
 * Fetch current wallet balance for the logged-in user.
 * @returns {Promise<{ success: boolean, data?: { balance: number }, message?: string }>}
 */
export async function getBalance() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) {
    return { success: false, message: 'Please log in' };
  }
  const response = await fetch(`${API_BASE_URL}/wallet/balance?userId=${encodeURIComponent(userId)}`);
  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to fetch balance' };
  }
  return data;
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
 * @returns {Promise<{ success: boolean, data?: Array<Bet>, message?: string }>}
 */
export async function getMyBetHistory() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) {
    return { success: false, message: 'Please log in' };
  }
  const url = `${API_BASE_URL}/bets/my-history?userId=${encodeURIComponent(userId)}`;
  const response = await fetch(url);
  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to fetch bet history' };
  }
  return data;
}
