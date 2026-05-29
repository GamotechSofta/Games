import { queryClient } from '../queryClient';
import { fetchPaymentConfig, paymentConfigQueryKey } from '../hooks/usePaymentConfig';
import { fetchBankAccounts, bankAccountsQueryKey } from '../hooks/useBankAccounts';
import { fetchDepositHistory, depositHistoryQueryKey } from '../hooks/useDepositHistory';
import { fetchWithdrawalHistory, withdrawalHistoryQueryKey } from '../hooks/useWithdrawalHistory';

function readUserId() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return user?.id || user?._id || null;
  } catch {
    return null;
  }
}

export function prefetchPaymentConfig() {
  return queryClient.prefetchQuery({
    queryKey: paymentConfigQueryKey(),
    queryFn: fetchPaymentConfig,
    staleTime: 5 * 60 * 1000,
  });
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
      staleTime: 60 * 1000,
    }),
    queryClient.prefetchQuery({
      queryKey: withdrawalHistoryQueryKey(userId),
      queryFn: () => fetchWithdrawalHistory(userId),
      staleTime: 60 * 1000,
    }),
  ]);
}
