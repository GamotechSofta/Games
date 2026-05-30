import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  clearMyBets,
  fetchMyBetsDataThunk,
  selectMyBets,
  selectMyBetsMarkets,
  selectMyBetsRates,
  selectMyBetsStatus,
} from '../store/slices/myBetsSlice';

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;

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
  limit = DEFAULT_LIMIT,
  enabled = true,
} = {}) {
  const dispatch = useAppDispatch();
  const userId = readUserId();
  const bets = useAppSelector(selectMyBets);
  const ratesMap = useAppSelector(selectMyBetsRates);
  const markets = useAppSelector(selectMyBetsMarkets);
  const { loading, isFetching, error } = useAppSelector(selectMyBetsStatus);

  useEffect(() => {
    if (!enabled || !userId) return;
    void dispatch(fetchMyBetsDataThunk({ days, limit }));
  }, [dispatch, enabled, userId, days, limit]);

  const invalidate = () => {
    dispatch(clearMyBets());
    if (userId) {
      void dispatch(fetchMyBetsDataThunk({ days, limit }));
    }
  };

  return {
    bets,
    ratesMap,
    markets,
    loading: enabled && Boolean(userId) && loading && !bets.length,
    isFetching,
    error: error || '',
    refetch: () => dispatch(fetchMyBetsDataThunk({ days, limit })),
    invalidate,
  };
}

export default useMyBetsData;
