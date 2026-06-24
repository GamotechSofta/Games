import { useCallback, useEffect, useMemo } from 'react';
import { fetchMainMarkets } from '../api/mainMarkets';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  fetchMainMarketsThunk,
  selectMainMarkets,
  selectMainMarketsStatus,
} from '../store/slices/marketsSlice';
import { mergeMarketsWithPopular } from '../utils/marketSearch';
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
  const allMarkets = useAppSelector(selectMainMarkets(false));
  const popularMarkets = useAppSelector(selectMainMarkets(true));
  const allStatus = useAppSelector(selectMainMarketsStatus(false));
  const popularStatus = useAppSelector(selectMainMarketsStatus(true));

  const markets = useMemo(() => {
    if (popularOnly) return popularMarkets;
    return mergeMarketsWithPopular(allMarkets, popularMarkets);
  }, [popularOnly, allMarkets, popularMarkets]);

  const popularSettled =
    popularStatus.status === 'succeeded' || popularStatus.status === 'failed';

  const loading = popularOnly
    ? popularStatus.loading
    : allStatus.loading || popularStatus.loading || !popularSettled;
  const error = popularOnly ? popularStatus.error : allStatus.error || popularStatus.error;

  const refetch = useCallback(
    (force = true) => {
      if (popularOnly) {
        return dispatch(fetchMainMarketsThunk({ popularOnly: true, force }));
      }
      return Promise.all([
        dispatch(fetchMainMarketsThunk({ popularOnly: false, force })),
        dispatch(fetchMainMarketsThunk({ popularOnly: true, force })),
      ]);
    },
    [dispatch, popularOnly],
  );

  useEffect(() => {
    void dispatch(fetchMainMarketsThunk({ popularOnly, force: false }));
    if (!popularOnly) {
      void dispatch(fetchMainMarketsThunk({ popularOnly: true, force: false }));
    }
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
