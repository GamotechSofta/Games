import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import fetchNoStore from '../utils/fetchNoStore';
import { queryClient } from '../queryClient';

const STALE_MS = 5 * 60 * 1000;

async function fetchMarketGroups(type) {
  const path = type === 'king' ? 'king-bazaar-groups' : 'starline-groups';
  const res = await fetchNoStore(`${API_BASE_URL}/markets/${path}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load markets');
  }
  return Array.isArray(data.data) ? data.data : [];
}

/**
 * Starline or King Bazaar group list (dashboard cards).
 * @param {'starline' | 'king'} type
 */
export function useMarketGroups(type, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['marketGroups', type],
    enabled: Boolean(enabled && type),
    queryFn: () => fetchMarketGroups(type),
    initialData: () => queryClient.getQueryData(['marketGroups', type]),
    staleTime: STALE_MS,
    gcTime: 15 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    groups: query.data || [],
    loading: query.isPending && !(query.data?.length),
    refetch: query.refetch,
  };
}

export default useMarketGroups;
