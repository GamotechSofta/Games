import { queryClient } from '../queryClient';
import { store } from '../store';
import { clearMyBets, patchBetStatus } from '../store/slices/myBetsSlice';
import {
  clearBetHistorySessionCache,
  clearUserDataSessionCaches,
  depositHistoryCacheKey,
  gameRatesCacheKey,
  withdrawalHistoryCacheKey,
} from './userDataCache';
import { clearSessionCache } from './sessionCache';

/** Clear bet-history session cache only — does not wipe Redux (avoids UI flash / stale refetch races). */
export function invalidateBetHistoryCaches(userId) {
  if (userId) clearBetHistorySessionCache(userId);
}

/** Immediately mark a bet cancelled in Redux so Bet History updates without waiting for refetch. */
export function markBetCancelledInStore(betId) {
  if (!betId) return;
  store.dispatch(patchBetStatus({ betId, status: 'cancelled' }));
}

export function invalidateDepositHistoryCaches(userId) {
  if (userId) clearSessionCache(depositHistoryCacheKey(userId));
  if (userId) void queryClient.invalidateQueries({ queryKey: ['depositHistory', userId] });
}

export function invalidateWithdrawalHistoryCaches(userId) {
  if (userId) clearSessionCache(withdrawalHistoryCacheKey(userId));
  if (userId) void queryClient.invalidateQueries({ queryKey: ['withdrawalHistory', userId] });
}

export function invalidateGameRatesCaches() {
  clearSessionCache(gameRatesCacheKey());
  void queryClient.invalidateQueries({ queryKey: ['gameRates', 'current'] });
}

export function invalidateAllUserDataCaches(userId) {
  if (userId) clearUserDataSessionCaches(userId);
  store.dispatch(clearMyBets());
  if (userId) {
    void queryClient.removeQueries({ queryKey: ['depositHistory', userId] });
    void queryClient.removeQueries({ queryKey: ['withdrawalHistory', userId] });
    void queryClient.removeQueries({ queryKey: ['walletBalance', userId] });
  }
  void queryClient.removeQueries({ queryKey: ['gameRates', 'current'] });
}
