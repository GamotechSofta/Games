import { queryClient } from '../queryClient';
import { API_BASE_URL } from '../config/api';

const STALE_MS = 5 * 60 * 1000;

async function fetchGroups(path) {
  const res = await fetch(`${API_BASE_URL}/markets/${path}`);
  const data = await res.json();
  if (!res.ok || !data?.success) return [];
  return Array.isArray(data.data) ? data.data : [];
}

/** Warm Starline / King Bazaar group lists after login. */
export function prefetchSpecialMarketGroups() {
  void queryClient.prefetchQuery({
    queryKey: ['marketGroups', 'starline'],
    queryFn: () => fetchGroups('starline-groups'),
    staleTime: STALE_MS,
  });
  void queryClient.prefetchQuery({
    queryKey: ['marketGroups', 'king'],
    queryFn: () => fetchGroups('king-bazaar-groups'),
    staleTime: STALE_MS,
  });
}
