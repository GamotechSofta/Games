import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBalance } from '../api/bets';
import { formatWalletAmount } from '../utils/walletBalance';

const WALLET_STALE_MS = 30 * 60 * 1000;

export function walletBalanceQueryKey(userId) {
  return ['walletBalance', userId || 'guest'];
}

export function useWallet() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);

  const loadStored = useCallback(() => {
    try {
      const raw = localStorage.getItem('user');
      if (raw) {
        const parsed = JSON.parse(raw);
        setUser(parsed);
        const b = parsed?.balance ?? parsed?.walletBalance ?? parsed?.wallet ?? 0;
        setBalance(Number(b));
      } else {
        setUser(null);
        setBalance(0);
      }
    } catch {
      setUser(null);
      setBalance(0);
    }
  }, []);

  const userId = user?.id || user?._id || null;

  const balanceQuery = useQuery({
    queryKey: walletBalanceQueryKey(userId),
    enabled: Boolean(userId),
    queryFn: async () => {
      const res = await getBalance();
      if (res.success && res.data?.balance != null) return Number(res.data.balance);
      throw new Error(res?.message || 'Failed to fetch balance');
    },
    staleTime: WALLET_STALE_MS,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    loadStored();
    const onBalance = (e) => {
      const next = Number(e?.detail?.balance);
      if (Number.isFinite(next)) {
        setBalance(next);
        if (userId) {
          queryClient.setQueryData(walletBalanceQueryKey(userId), next);
        }
      } else {
        loadStored();
      }
    };
    const onLogin = () => {
      loadStored();
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const id = u?.id || u?._id;
        if (id) {
          void queryClient.invalidateQueries({ queryKey: walletBalanceQueryKey(id) });
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', loadStored);
    window.addEventListener('userLogin', onLogin);
    window.addEventListener('userLogout', loadStored);
    window.addEventListener('balanceUpdated', onBalance);
    return () => {
      window.removeEventListener('storage', loadStored);
      window.removeEventListener('userLogin', onLogin);
      window.removeEventListener('userLogout', loadStored);
      window.removeEventListener('balanceUpdated', onBalance);
    };
  }, [loadStored, queryClient, userId]);

  useEffect(() => {
    if (balanceQuery.data == null || balanceQuery.isFetching) return;
    setBalance(balanceQuery.data);
  }, [balanceQuery.data, balanceQuery.isFetching]);

  const formattedBalance = formatWalletAmount(balance != null ? balance : 0);

  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return { user, balance, formattedBalance, avatarInitial };
}
