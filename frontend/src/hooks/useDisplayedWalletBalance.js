import { useEffect, useState } from 'react';
import { getStoredWalletBalance } from '../utils/walletBalance';

/**
 * Wallet balance for header UI — reads localStorage and listens for socket/bet updates.
 */
export function useDisplayedWalletBalance() {
  const [balance, setBalance] = useState(() => getStoredWalletBalance());

  useEffect(() => {
    const syncFromStorage = () => setBalance(getStoredWalletBalance());

    const onBalanceUpdated = (event) => {
      const next = Number(event?.detail?.balance);
      if (Number.isFinite(next)) {
        setBalance(next);
        return;
      }
      syncFromStorage();
    };

    const onLogout = () => setBalance(0);

    syncFromStorage();
    window.addEventListener('balanceUpdated', onBalanceUpdated);
    window.addEventListener('userLogin', syncFromStorage);
    window.addEventListener('userLogout', onLogout);
    window.addEventListener('storage', syncFromStorage);

    return () => {
      window.removeEventListener('balanceUpdated', onBalanceUpdated);
      window.removeEventListener('userLogin', syncFromStorage);
      window.removeEventListener('userLogout', onLogout);
      window.removeEventListener('storage', syncFromStorage);
    };
  }, []);

  return balance;
}

export default useDisplayedWalletBalance;
