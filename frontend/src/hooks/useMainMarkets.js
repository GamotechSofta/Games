import { useCallback, useEffect } from 'react';
import { fetchMainMarkets } from '../api/mainMarkets';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMainMarketsThunk,
  selectMainMarkets,
  selectMainMarketsStatus,
} from '../store/slices/marketsSlice';
import useSectionAutoRefresh from './useSectionAutoRefresh';

export { fetchMainMarkets } from '../api/mainMarkets';

/** @deprecated React Query key — kept for any legacy prefetch callers */
export function mainMarketsQueryKey(popularOnly = false) {
  return ['mainMarkets', popularOnly];
}

export default function useMainMarkets({ refreshMs = 0, popularOnly = false } = {}) {
  const dispatch = useAppDispatch();
  const markets = useAppSelector(selectMainMarkets(popularOnly));
  const { loading, error } = useAppSelector(selectMainMarketsStatus(popularOnly));

  const refetch = useCallback(
    () => dispatch(fetchMainMarketsThunk(popularOnly)),
    [dispatch, popularOnly],
  );

  useEffect(() => {
    void dispatch(fetchMainMarketsThunk(popularOnly));
  }, [dispatch, popularOnly]);

  useSectionAutoRefresh({
    enabled: refreshMs > 0,
    intervalMs: refreshMs,
    immediate: false,
    onRefresh: refetch,
  });

  return {
    markets,
    loading,
    error: error || '',
    refetch,
  };
}
