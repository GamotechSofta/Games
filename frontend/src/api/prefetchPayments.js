import { queryClient } from '../queryClient';
import { fetchBankAccounts, bankAccountsQueryKey } from '../hooks/useBankAccounts';
import {
  DEPOSIT_HISTORY_STALE_MS,
  fetchDepositHistory,
  depositHistoryQueryKey,
} from '../hooks/useDepositHistory';
import {
  fetchWithdrawalHistory,
  WITHDRAWAL_HISTORY_STALE_MS,
  withdrawalHistoryQueryKey,
} from '../hooks/useWithdrawalHistory';
import { prefetchPaymentConfigStore } from '../store/prefetch';

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

export function prefetchPaymentConfig() {
  return prefetchPaymentConfigStore();
}

export function prefetchBankAccounts() {
  const userId = readUserId();
  if (!userId) return;
  return queryClient.prefetchQuery({
    queryKey: bankAccountsQueryKey(userId),
    queryFn: () => fetchBankAccounts(userId),
    staleTime: 60 * 1000,
  });
}

export function prefetchFundsHistory() {
  const userId = readUserId();
  if (!userId) return;
  return Promise.all([
    queryClient.prefetchQuery({
      queryKey: depositHistoryQueryKey(userId),
      queryFn: () => fetchDepositHistory(userId),
      staleTime: DEPOSIT_HISTORY_STALE_MS,
    }),
    queryClient.prefetchQuery({
      queryKey: withdrawalHistoryQueryKey(userId),
      queryFn: () => fetchWithdrawalHistory(userId),
      staleTime: WITHDRAWAL_HISTORY_STALE_MS,
    }),
  ]);
}
