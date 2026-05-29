import { queryClient } from '../queryClient';
import { getMyBetHistory, getRatesCurrent } from './bets';

const DEFAULT_DAYS = 30;
const DEFAULT_LIMIT = 200;

export function prefetchMyBetsData() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) return;

  void queryClient.prefetchQuery({
    queryKey: ['myBetHistory', userId, DEFAULT_DAYS, DEFAULT_LIMIT],
    queryFn: async () => {
      const res = await getMyBetHistory({ days: DEFAULT_DAYS, limit: DEFAULT_LIMIT });
      if (!res?.success) throw new Error(res?.message || 'Failed to load bet history');
      return Array.isArray(res.data) ? res.data : [];
    },
    staleTime: 60 * 1000,
  });

  void queryClient.prefetchQuery({
    queryKey: ['ratesCurrent'],
    queryFn: async () => {
      const res = await getRatesCurrent();
      if (!res?.success) throw new Error(res?.message || 'Failed to load rates');
      return res.data || null;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** @deprecated */
export const prefetchMyBetsBootstrap = prefetchMyBetsData;
export const prefetchMyBetHistory = prefetchMyBetsData;
