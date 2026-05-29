import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import { transformMarkets } from '../utils/homeTransforms';

export async function fetchMainMarkets(popularOnly = false) {
  const params = new URLSearchParams({
    marketType: 'main',
    fields: 'home',
  });
  if (popularOnly) params.set('popularOnly', 'true');
  const response = await fetch(`${API_BASE_URL}/markets/get-markets?${params.toString()}`);
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load markets');
  }
  return transformMarkets(data.data);
}

/** Shared query key for markets list (prefetch + hooks). */
export function mainMarketsQueryKey(popularOnly = false) {
  return ['mainMarkets', popularOnly];
}

export default function useMainMarkets({ refreshMs = 0, popularOnly = false } = {}) {
  const marketsQuery = useQuery({
    queryKey: mainMarketsQueryKey(popularOnly),
    queryFn: () => fetchMainMarkets(popularOnly),
    staleTime: 60 * 1000,
    refetchInterval: refreshMs > 0 ? refreshMs : false,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    markets: marketsQuery.data || [],
    loading: marketsQuery.isLoading,
    error: marketsQuery.error?.message || '',
    refetch: () => marketsQuery.refetch(),
  };
}
