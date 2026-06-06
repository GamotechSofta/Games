import { useCallback, useEffect } from 'react';
import { fetchMainMarkets } from '../api/mainMarkets';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMainMarketsThunk,
  selectMainMarkets,
  selectMainMarketsStatus,
} from '../store/slices/marketsSlice';
import {
  subscribeMarketScheduleRefresh,
  updateMarketScheduleRefresh,
} from '../utils/marketScheduleRefresh';

export { fetchMainMarkets } from '../api/mainMarkets';

/** @deprecated React Query key — kept for any legacy prefetch callers */
export function mainMarketsQueryKey(popularOnly = false) {
  return ['mainMarkets', popularOnly];
}

export default function useMainMarkets({ popularOnly = false } = {}) {
  const dispatch = useAppDispatch();
  const markets = useAppSelector(selectMainMarkets(popularOnly));
  const { loading, error } = useAppSelector(selectMainMarketsStatus(popularOnly));

  const refetch = useCallback(
    (force = true) => dispatch(fetchMainMarketsThunk({ popularOnly, force })),
    [dispatch, popularOnly],
  );

  useEffect(() => {
    void dispatch(fetchMainMarketsThunk({ popularOnly, force: false }));
  }, [dispatch, popularOnly]);

  useEffect(() => {
    return subscribeMarketScheduleRefresh(() => {
      void dispatch(fetchMainMarketsThunk({ popularOnly: false, force: true }));
      void dispatch(fetchMainMarketsThunk({ popularOnly: true, force: true }));
    });
  }, [dispatch]);

  useEffect(() => {
    if (markets.length) {
      updateMarketScheduleRefresh(markets);
    }
  }, [markets]);

  return {
    markets,
    loading,
    error: error || '',
    refetch,
  };
}
