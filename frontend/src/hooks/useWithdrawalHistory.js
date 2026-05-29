import { useQuery } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';

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

export async function fetchWithdrawalHistory(userId) {
  const res = await fetch(`${API_BASE_URL}/payments/my-withdrawals?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load withdrawal history');
  }
  return (data.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export default function useWithdrawalHistory() {
  const userId = readUserId();
  const query = useQuery({
    queryKey: withdrawalHistoryQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchWithdrawalHistory(userId),
    staleTime: 60 * 1000,
    placeholderData: [],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    withdrawals: query.data || [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
