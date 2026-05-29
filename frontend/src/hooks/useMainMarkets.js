import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import useHomeBootstrap from './useHomeBootstrap';
import { transformMarkets } from '../utils/homeTransforms';

/** 0 = no background polling (rely on cache + manual/midnight refresh) */
const DEFAULT_REFRESH_MS = 0;
const DEFAULT_LIMIT = 24;

export default function useMainMarkets({
  refreshMs = DEFAULT_REFRESH_MS,
  limit = DEFAULT_LIMIT,
  popularOnly = false,
} = {}) {
  const useBootstrap = limit <= DEFAULT_LIMIT && !popularOnly;
  const bootstrap = useHomeBootstrap({ marketLimit: limit, gameLimit: 12 });
  const bootstrapUnavailable =
    bootstrap.error?.code === 'HOME_BOOTSTRAP_UNAVAILABLE' ||
    bootstrap.error?.message === 'HOME_BOOTSTRAP_UNAVAILABLE';

  const marketsQuery = useQuery({
    queryKey: ['mainMarkets', limit, popularOnly],
    enabled: !useBootstrap || bootstrapUnavailable,
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
    staleTime: 60 * 1000,
    refetchInterval: refreshMs > 0 ? refreshMs : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const markets = useMemo(() => {
    if (useBootstrap && !bootstrapUnavailable) return bootstrap.data?.transformedMarkets || [];
    return marketsQuery.data || [];
  }, [useBootstrap, bootstrapUnavailable, bootstrap.data, marketsQuery.data]);

  return {
    markets,
    loading: useBootstrap && !bootstrapUnavailable ? bootstrap.isLoading : marketsQuery.isLoading,
    error:
      (useBootstrap && !bootstrapUnavailable ? bootstrap.error : marketsQuery.error)?.message || '',
    refetch: () =>
      (useBootstrap && !bootstrapUnavailable ? bootstrap.refetch() : marketsQuery.refetch()),
  };
}
