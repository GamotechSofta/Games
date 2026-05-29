import { queryClient } from '../queryClient';
import { fetchMyBetsBootstrap } from './bets';
import { myBetsBootstrapQueryKey } from '../hooks/useMyBetsBootstrap';

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;

export function prefetchMyBetsBootstrap() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) return;

  return queryClient.prefetchQuery({
    queryKey: myBetsBootstrapQueryKey(userId, DEFAULT_DAYS, DEFAULT_LIMIT),
    queryFn: async () => {
      const result = await fetchMyBetsBootstrap({ days: DEFAULT_DAYS, limit: DEFAULT_LIMIT });
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
    staleTime: 60 * 1000,
  });
}

/** @deprecated use prefetchMyBetsBootstrap */
export const prefetchMyBetHistory = prefetchMyBetsBootstrap;
