import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import { createSharedFetcher, getSessionCache, setSessionCache } from '../utils/sessionCache';
import {
  USER_DATA_CACHE_TTL_MS,
  withdrawalHistoryCacheKey,
} from '../utils/userDataCache';

const runSharedRequest = createSharedFetcher();

export const WITHDRAWAL_HISTORY_STALE_MS = USER_DATA_CACHE_TTL_MS;

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

export function withdrawalHistoryQueryKey(userId) {
  return ['withdrawalHistory', userId || 'guest'];
}

export async function fetchWithdrawalHistory(userId, { force = false } = {}) {
  const cacheKey = withdrawalHistoryCacheKey(userId);
  if (!force) {
    const cached = getSessionCache(cacheKey);
    if (cached) return cached;
  }

  return runSharedRequest(cacheKey, async () => {
    const res = await fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${encodeURIComponent(userId)}`);
    const data = await res.json();
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load withdrawal history');
    }
    const sorted = (data.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setSessionCache(cacheKey, sorted, USER_DATA_CACHE_TTL_MS);
    return sorted;
  });
}

export default function useWithdrawalHistory() {
  const userId = readUserId();
  const query = useQuery({
    queryKey: withdrawalHistoryQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWithdrawalHistory(userId),
    staleTime: WITHDRAWAL_HISTORY_STALE_MS,
    gcTime: 60 * 60 * 1000,
    placeholderData: (previous) => previous ?? [],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    withdrawals: query.data || [],
    isFetching: query.isFetching,
    loading: query.isLoading && !query.data?.length,
    refetch: query.refetch,
  };
}
