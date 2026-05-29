import { useQuery, useQueryClient } from '@tanstack/react-query';
import { clearMyBetsBootstrapCache, fetchMyBetsBootstrap } from '../api/bets';

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;
const STALE_MS = 60 * 1000;

export function myBetsBootstrapQueryKey(userId, days = DEFAULT_DAYS, limit = DEFAULT_LIMIT) {
  return ['myBetsBootstrap', userId, days, limit];
}

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

export function useMyBetsBootstrap({
  days = DEFAULT_DAYS,
  limit = DEFAULT_LIMIT,
  enabled = true,
} = {}) {
  const queryClient = useQueryClient();
  const userId = readUserId();

  const query = useQuery({
    queryKey: myBetsBootstrapQueryKey(userId, days, limit),
    enabled: Boolean(enabled && userId),
    queryFn: async () => {
      const result = await fetchMyBetsBootstrap({ days, limit });
      if (!result?.success) {
        throw new Error(result?.message || 'Failed to load my bets data');
      }
      const payload = result.data || {};
      return {
        bets: payload.bets || [],
        rates: payload.rates || null,
        markets: payload.markets || [],
      };
    },
    staleTime: STALE_MS,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
  });

  const invalidate = () => {
    clearMyBetsBootstrapCache();
    if (userId) {
      queryClient.invalidateQueries({ queryKey: ['myBetsBootstrap', userId] });
    }
  };

  return {
    bets: query.data?.bets || [],
    ratesMap: query.data?.rates || null,
    markets: query.data?.markets || [],
    loading: query.isLoading && !query.data,
    isFetching: query.isFetching,
    error: query.error?.message || '',
    refetch: query.refetch,
    invalidate,
  };
}

export default useMyBetsBootstrap;
