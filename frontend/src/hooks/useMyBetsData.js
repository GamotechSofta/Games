import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMyBetHistory, getRatesCurrent } from '../api/bets';

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;
const BETS_STALE_MS = 60 * 1000;
const RATES_STALE_MS = 5 * 60 * 1000;

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

function marketsFromBets(bets) {
  const map = new Map();
  for (const bet of bets || []) {
    const m = bet.marketId;
    if (m && typeof m === 'object' && m._id) {
      map.set(String(m._id), m);
    }
  }
  return Array.from(map.values());
}

/**
 * My Bets / Bet History — separate APIs: my-history + rates/current.
 */
export function useMyBetsData({
  days = DEFAULT_DAYS,
  limit = DEFAULT_LIMIT,
  enabled = true,
} = {}) {
  const queryClient = useQueryClient();
  const userId = readUserId();

  const betsQuery = useQuery({
    queryKey: ['myBetHistory', userId, days, limit],
    enabled: Boolean(enabled && userId),
    queryFn: async () => {
      const res = await getMyBetHistory({ days, limit });
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to load bet history');
      }
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: BETS_STALE_MS,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const ratesQuery = useQuery({
    queryKey: ['ratesCurrent'],
    enabled: Boolean(enabled && userId),
    queryFn: async () => {
      const res = await getRatesCurrent();
      if (!res?.success) {
        throw new Error(res?.message || 'Failed to load rates');
      }
      return res.data || null;
    },
    staleTime: RATES_STALE_MS,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const bets = betsQuery.data || [];
  const markets = useMemo(() => marketsFromBets(bets), [bets]);

  const invalidate = () => {
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['myBetHistory', userId] });
    }
    queryClient.invalidateQueries({ queryKey: ['ratesCurrent'] });
  };

  const refetch = () =>
    Promise.all([betsQuery.refetch(), ratesQuery.refetch()]);

  return {
    bets,
    ratesMap: ratesQuery.data || null,
    markets,
    loading:
      (betsQuery.isPending && !bets.length) ||
      (ratesQuery.isPending && ratesQuery.data == null),
    isFetching: betsQuery.isFetching || ratesQuery.isFetching,
    error: betsQuery.error?.message || ratesQuery.error?.message || '',
    refetch,
    invalidate,
  };
}

export default useMyBetsData;
