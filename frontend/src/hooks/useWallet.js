import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getBalance, updateUserBalance } from '../api/bets';

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
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    loadStored();
    window.addEventListener('storage', loadStored);
    window.addEventListener('userLogin', loadStored);
    window.addEventListener('userLogout', loadStored);
    return () => {
      window.removeEventListener('storage', loadStored);
      window.removeEventListener('userLogin', loadStored);
      window.removeEventListener('userLogout', loadStored);
    };
  }, [loadStored]);

  useEffect(() => {
    if (balanceQuery.data == null) return;
    updateUserBalance(balanceQuery.data);
    setBalance(balanceQuery.data);
  }, [balanceQuery.data]);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance != null ? Number(balance) : 0);

  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return { user, balance, formattedBalance, avatarInitial };
}
