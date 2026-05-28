import { useQuery } from '@tanstack/react-query';
import { fetchHomeBootstrap } from '../api/home';
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
      return {
        ...data,
        transformedMarkets: transformMarkets(data?.markets || []),
      };
    },
    staleTime: 25 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });
}

