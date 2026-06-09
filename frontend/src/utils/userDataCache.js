import { clearSessionCache } from './sessionCache';

/** Session cache TTL — data kept until logout or explicit invalidation. */
export const USER_DATA_CACHE_TTL_MS = 30 * 60 * 1000;

export function gameRatesCacheKey() {
  return 'rates.current';
}

export function betHistoryCacheKey(userId, days = 30, limit = 50, skip = 0) {
  return `bets.history.${userId}.${days}.${limit}.${skip}`;
}

export function betHistoryCachePrefix(userId) {
  return `bets.history.${userId}.`;
}

export function depositHistoryCacheKey(userId) {
  return `payments.deposits.${userId}`;
}

export function withdrawalHistoryCacheKey(userId) {
  return `payments.withdrawals.${userId}`;
}

export function walletBalanceCacheKey(userId) {
  return `wallet.balance.${userId}`;
}

export function clearBetHistorySessionCache(userId) {
  if (!userId) return;
  const prefix = betHistoryCachePrefix(userId);
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i += 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(prefix)) keysToRemove.push(key);
    }
    keysToRemove.forEach((key) => clearSessionCache(key));
  } catch {
    /* ignore */
  }
}

export function clearUserDataSessionCaches(userId) {
  if (!userId) return;
  clearBetHistorySessionCache(userId);
  clearSessionCache(depositHistoryCacheKey(userId));
  clearSessionCache(withdrawalHistoryCacheKey(userId));
  clearSessionCache(walletBalanceCacheKey(userId));
  clearSessionCache(gameRatesCacheKey());
}
