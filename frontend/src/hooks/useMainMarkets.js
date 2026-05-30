import { useEffect } from 'react';
import { fetchMainMarkets } from '../api/mainMarkets';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMainMarketsThunk,
  selectMainMarkets,
  selectMainMarketsStatus,
} from '../store/slices/marketsSlice';

export { fetchMainMarkets } from '../api/mainMarkets';

/** @deprecated React Query key — kept for any legacy prefetch callers */
export function mainMarketsQueryKey(popularOnly = false) {
  return ['mainMarkets', popularOnly];
}

export default function useMainMarkets({ refreshMs = 0, popularOnly = false } = {}) {
  const dispatch = useAppDispatch();
  const markets = useAppSelector(selectMainMarkets(popularOnly));
  const { loading, error } = useAppSelector(selectMainMarketsStatus(popularOnly));

  useEffect(() => {
    void dispatch(fetchMainMarketsThunk(popularOnly));
  }, [dispatch, popularOnly]);

  useEffect(() => {
    if (!refreshMs || refreshMs <= 0) return undefined;
    const id = setInterval(() => {
      void dispatch(fetchMainMarketsThunk(popularOnly));
    }, refreshMs);
    return () => clearInterval(id);
  }, [dispatch, popularOnly, refreshMs]);

  return {
    markets,
    loading,
    error: error || '',
    refetch: () => dispatch(fetchMainMarketsThunk(popularOnly)),
  };
}
