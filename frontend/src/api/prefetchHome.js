import { queryClient } from '../queryClient';
import { getBalance } from './bets';
import { prefetchMainMarketsStore } from '../store/prefetch';

export function prefetchMainMarkets() {
  return Promise.all([
    prefetchMainMarketsStore(false),
    prefetchMainMarketsStore(true),
  ]);
}

export function prefetchWalletBalance() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const userId = user?.id || user?._id;
  if (!userId) return;

  return queryClient.prefetchQuery({
    queryKey: ['walletBalance', userId],
    queryFn: async () => {
      const res = await getBalance();
      if (!res?.success) throw new Error(res?.message || 'Failed to load balance');
      return res;
    },
    staleTime: 30 * 1000,
  });
}
