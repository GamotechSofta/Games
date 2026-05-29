import { queryClient } from '../queryClient';
import { fetchHomeBootstrap } from './home';
import { transformMarkets } from '../utils/homeTransforms';
import { updateUserBalance } from './bets';
import { fetchMainMarkets, mainMarketsQueryKey } from '../hooks/useMainMarkets';

const DEFAULT_MARKET_LIMIT = 24;
const DEFAULT_GAME_LIMIT = 12;

export function prefetchMainMarkets() {
  return queryClient.prefetchQuery({
    queryKey: mainMarketsQueryKey(false),
    queryFn: () => fetchMainMarkets(false),
    staleTime: 60 * 1000,
  });
}

export function prefetchHomeBootstrap() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.id && !user?._id) return;

  return queryClient.prefetchQuery({
    queryKey: ['homeBootstrap', DEFAULT_MARKET_LIMIT, DEFAULT_GAME_LIMIT],
    queryFn: async () => {
      const data = await fetchHomeBootstrap({
        marketLimit: DEFAULT_MARKET_LIMIT,
        gameLimit: DEFAULT_GAME_LIMIT,
      });
      if (data?.wallet?.balance != null) {
        updateUserBalance(data.wallet.balance);
      }
      return {
        ...data,
        transformedMarkets: transformMarkets(data?.markets || []),
      };
    },
    staleTime: 60 * 1000,
  });
}
