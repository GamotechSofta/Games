import { queryClient } from '../queryClient';
import { API_BASE_URL } from '../config/api';

const STALE_MS = 5 * 60 * 1000;

async function fetchGroups(path) {
  const res = await fetch(`${API_BASE_URL}/markets/${path}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.success) return [];
  return Array.isArray(data.data) ? data.data : [];
}

/** Light prefetch: group lists only (no heavy bootstrap / all slots). */
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

/** Preload route chunks for instant navigation. */
export function prefetchSpecialMarketChunks() {
  void import('../pages/StartlineDashboard');
  void import('../pages/StarlineMarket');
  void import('../pages/KingBazaarMarket');
}
