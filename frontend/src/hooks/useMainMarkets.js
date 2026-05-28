import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import useHomeBootstrap from './useHomeBootstrap';
import { transformMarkets } from '../utils/homeTransforms';

const DEFAULT_REFRESH_MS = 90 * 1000;
const DEFAULT_LIMIT = 24;

export default function useMainMarkets({
  refreshMs = DEFAULT_REFRESH_MS,
  limit = DEFAULT_LIMIT,
  popularOnly = false,
} = {}) {
  const useBootstrap = limit === DEFAULT_LIMIT && !popularOnly;
  const bootstrap = useHomeBootstrap({ marketLimit: limit, gameLimit: 12 });

  const marketsQuery = useQuery({
    queryKey: ['mainMarkets', limit, popularOnly],
    enabled: !useBootstrap,
    queryFn: async () => {
      const params = new URLSearchParams({
        marketType: 'main',
        fields: 'home',
        limit: String(limit),
      });
      if (popularOnly) params.set('popularOnly', 'true');
      const response = await fetch(`${API_BASE_URL}/markets/get-markets?${params.toString()}`);
      const data = await response.json();
      if (!response.ok || !data?.success) throw new Error(data?.message || 'Failed to load markets');
      return transformMarkets(data.data);
    },
    staleTime: 25 * 1000,
    refetchInterval: refreshMs,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const markets = useMemo(() => {
    if (useBootstrap) return bootstrap.data?.transformedMarkets || [];
    return marketsQuery.data || [];
  }, [useBootstrap, bootstrap.data, marketsQuery.data]);

  return {
    markets,
    loading: useBootstrap ? bootstrap.isLoading : marketsQuery.isLoading,
    error: (useBootstrap ? bootstrap.error : marketsQuery.error)?.message || '',
    refetch: () => (useBootstrap ? bootstrap.refetch() : marketsQuery.refetch()),
  };
}
