import { useQuery } from '@tanstack/react-query';
import { fetchHomeBootstrap } from '../api/home';
import { updateUserBalance } from '../api/bets';
import { transformMarkets } from '../utils/homeTransforms';

const DEFAULT_MARKET_LIMIT = 24;
const DEFAULT_GAME_LIMIT = 12;

export default function useHomeBootstrap({
  marketLimit = DEFAULT_MARKET_LIMIT,
  gameLimit = DEFAULT_GAME_LIMIT,
} = {}) {
  return useQuery({
    queryKey: ['homeBootstrap', marketLimit, gameLimit],
    queryFn: async () => {
      const data = await fetchHomeBootstrap({ marketLimit, gameLimit });
      if (data?.wallet?.balance != null) {
        updateUserBalance(data.wallet.balance);
      }
      return {
        ...data,
        transformedMarkets: transformMarkets(data?.markets || []),
      };
    },
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
    retry: 1,
  });
}

