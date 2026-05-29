import { queryClient } from '../queryClient';
import { getBalance } from './bets';
import { fetchMainMarkets, mainMarketsQueryKey } from '../hooks/useMainMarkets';

export function prefetchMainMarkets() {
  return queryClient.prefetchQuery({
    queryKey: mainMarketsQueryKey(false),
    queryFn: () => fetchMainMarkets(false),
    staleTime: 60 * 1000,
  });
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
