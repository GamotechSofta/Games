import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';

const STALE_MS = 60 * 1000;

async function fetchResultHistory(dateKey) {
  const res = await fetch(
    `${API_BASE_URL}/markets/result-history?date=${encodeURIComponent(dateKey)}`,
  );
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load result history');
  }
  return (data.data || [])
    .map((x) => ({
      id: x?._id || `${x?.marketId || ''}-${x?.dateKey || ''}`,
      name: (x?.marketName || '').toString().trim().toUpperCase(),
      result: (x?.displayResult || '***-**-***').toString().trim(),
      startingTime: x?.startingTime || null,
      closingTime: x?.closingTime || null,
    }))
    .filter((x) => x.name)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function useMarketResultHistory(dateKey, { enabled = true } = {}) {
  const query = useQuery({
    queryKey: ['marketResultHistory', dateKey],
    enabled: Boolean(enabled && dateKey),
    queryFn: () => fetchResultHistory(dateKey),
    staleTime: STALE_MS,
    gcTime: 10 * 60 * 1000,
    placeholderData: (previous) => previous,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    rows: query.data || [],
    loading: query.isLoading && !query.data?.length,
    refetch: query.refetch,
  };
}

export default useMarketResultHistory;
