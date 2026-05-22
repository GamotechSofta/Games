import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    loadStored();

    const fetchBalance = async () => {
      try {
        const u = JSON.parse(localStorage.getItem('user') || 'null');
        const userId = u?.id || u?._id;
        if (!userId) return;
        const res = await getBalance();
        if (res.success && res.data?.balance != null) {
          updateUserBalance(res.data.balance);
          setBalance(res.data.balance);
        }
      } catch (_) {}
    };

    fetchBalance();
    window.addEventListener('storage', loadStored);
    window.addEventListener('userLogin', loadStored);
    window.addEventListener('userLogout', loadStored);
    return () => {
      window.removeEventListener('storage', loadStored);
      window.removeEventListener('userLogin', loadStored);
      window.removeEventListener('userLogout', loadStored);
    };
  }, [loadStored]);

  const formattedBalance = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(balance != null ? Number(balance) : 0);

  const avatarInitial = (user?.username || 'U').charAt(0).toUpperCase();

  return { user, balance, formattedBalance, avatarInitial };
}
