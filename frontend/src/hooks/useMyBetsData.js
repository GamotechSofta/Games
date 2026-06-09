import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { BET_HISTORY_DAYS, clearBetHistorySessionCache } from '../utils/userDataCache';
import {
  fetchMyBetsDataThunk,
  MY_BETS_PAGE_SIZE,
  selectMyBets,
  selectMyBetsHasMore,
  selectMyBetsMarkets,
  selectMyBetsRates,
  selectMyBetsStatus,
} from '../store/slices/myBetsSlice';

const DEFAULT_DAYS = BET_HISTORY_DAYS;

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

/**
 * My Bets / Bet History — my-history + rates/current (Redux).
 */
export function useMyBetsData({
  days = DEFAULT_DAYS,
  limit = MY_BETS_PAGE_SIZE,
  enabled = true,
} = {}) {
  const dispatch = useAppDispatch();
  const userId = readUserId();
  const bets = useAppSelector(selectMyBets);
  const ratesMap = useAppSelector(selectMyBetsRates);
  const markets = useAppSelector(selectMyBetsMarkets);
  const hasMore = useAppSelector(selectMyBetsHasMore);
  const { loading, isFetching, error } = useAppSelector(selectMyBetsStatus);

  useEffect(() => {
    if (!enabled || !userId) return;
    void dispatch(fetchMyBetsDataThunk({ days, limit, skip: 0, append: false }));
  }, [dispatch, enabled, userId, days, limit]);

  const invalidate = useCallback(() => {
    if (userId) clearBetHistorySessionCache(userId);
    void dispatch(fetchMyBetsDataThunk({ days, limit, skip: 0, append: false, force: true }));
  }, [dispatch, userId, days, limit]);

  const loadMore = useCallback(() => {
    if (!userId || !hasMore || isFetching) return;
    void dispatch(fetchMyBetsDataThunk({
      days,
      limit,
      skip: bets.length,
      append: true,
    }));
  }, [dispatch, userId, hasMore, isFetching, days, limit, bets.length]);

  return {
    bets,
    ratesMap,
    markets,
    hasMore,
    loading: enabled && Boolean(userId) && loading && !bets.length,
    isFetching,
    error: error || '',
    refetch: () => dispatch(fetchMyBetsDataThunk({ days, limit, skip: 0, append: false, force: true })),
    loadMore,
    invalidate,
  };
}

export default useMyBetsData;
