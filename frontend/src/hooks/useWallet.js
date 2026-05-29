import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalance, updateUserBalance } from '../api/bets';
import { formatWalletAmount } from '../utils/walletBalance';

export function useWallet() {
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

  const balanceQuery = useQuery({
    queryKey: ['walletBalance', user?.id || user?._id || 'guest'],
    enabled: Boolean(user?.id || user?._id),
    queryFn: async () => {
      const res = await getBalance();
      if (res.success && res.data?.balance != null) return Number(res.data.balance);
      throw new Error(res?.message || 'Failed to fetch balance');
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: 5 * 60 * 1000,
    retry: 1,
  });

  useEffect(() => {
    loadStored();
    const onBalance = (e) => {
      const next = Number(e?.detail?.balance);
      if (Number.isFinite(next)) {
        setBalance(next);
      } else {
        loadStored();
      }
    };
    window.addEventListener('storage', loadStored);
    window.addEventListener('userLogin', loadStored);
    window.addEventListener('userLogout', loadStored);
    window.addEventListener('balanceUpdated', onBalance);
    return () => {
      window.removeEventListener('storage', loadStored);
      window.removeEventListener('userLogin', loadStored);
      window.removeEventListener('userLogout', loadStored);
      window.removeEventListener('balanceUpdated', onBalance);
    };
  }, [loadStored]);

  useEffect(() => {
    if (balanceQuery.data == null) return;
    updateUserBalance(balanceQuery.data);
    setBalance(balanceQuery.data);
  }, [balanceQuery.data]);

  const formattedBalance = formatWalletAmount(balance != null ? balance : 0);

  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return { user, balance, formattedBalance, avatarInitial };
}
