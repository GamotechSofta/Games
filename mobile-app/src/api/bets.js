import { API_BASE_URL } from '../config/api';
import { redirectToLoginIf401 } from '../utils/auth';
import { storage } from '../utils/storage';
import { emit } from '../utils/events';

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

async function getStoredUser() {
  const userStr = await storage.getItem('user');
  return userStr ? JSON.parse(userStr) : null;
}

/**
 * Update stored user balance and notify app (e.g. header wallet).
 */
export async function updateUserBalance(newBalance) {
  try {
    const userStr = await storage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : {};
    user.balance = newBalance;
    await storage.setItem('user', JSON.stringify(user));
    emit('userLogin');
  } catch (_) {}
}

export async function placeBet(marketId, bets, scheduledDate) {
  const user = await getStoredUser();
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
    if (s === 'open' || s === 'openbet') return 'open';
    if (s === 'close' || s === 'closed' || s === 'closebet') return 'close';
    return undefined;
  };

  const payload = {
    userId,
    marketId: normalizedMarketId,
    bets: bets.map((b) => ({
      betType: b.betType,
      betNumber: String(b.betNumber).trim(),
      amount: Number(b.amount) || 0,
      betOn: normalizeBetOn(b.betOn) || normalizeBetOn(b.session) || normalizeBetOn(b.type),
    })),
  };
  if (scheduledDate) payload.scheduledDate = scheduledDate;

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

export async function cancelBet(betId) {
  const user = await getStoredUser();
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

  const response = await fetch(`${API_BASE_URL}/bets/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, betId: normalizedBetId }),
  });

  if (redirectToLoginIf401(response)) return { success: false, message: 'Session expired' };

  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to cancel bet', code: data.code };
  }
  return data;
}

export async function getRatesCurrent() {
  const response = await fetch(`${API_BASE_URL}/rates/current`);
  const data = await response.json();
  if (!response.ok) {
    return { success: false, message: data.message || 'Failed to fetch rates' };
  }
  return data;
}

export async function getBalance() {
  const user = await getStoredUser();
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

export async function getMyWalletTransactions(limit = 200) {
  const user = await getStoredUser();
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

export async function getMyBetHistory() {
  const user = await getStoredUser();
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
