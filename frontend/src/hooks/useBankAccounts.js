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

export function bankAccountsQueryKey(userId) {
  return ['bankAccounts', userId || 'guest'];
}

export async function fetchBankAccounts(userId) {
  if (!userId) return [];
  const res = await fetch(`${API_BASE_URL}/bank-details?userId=${encodeURIComponent(userId)}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load bank accounts');
  }
  return data.data || [];
}

export default function useBankAccounts() {
  const userId = readUserId();
  const query = useQuery({
    queryKey: bankAccountsQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: () => fetchBankAccounts(userId),
    staleTime: 60 * 1000,
    placeholderData: [],
    refetchOnWindowFocus: false,
    retry: 1,
  });

  return {
    bankAccounts: query.data || [],
    isFetching: query.isFetching,
    refetch: query.refetch,
  };
}
