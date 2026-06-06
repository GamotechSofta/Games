import { useEffect } from 'react';
import { getBalance, updateUserBalance } from '../api/bets';

const BOOTSTRAP_DELAY_MS = 2500;

/**
 * One deferred balance fetch per logged-in session (shared across headers).
 * Socket updates and getBalance session cache handle the rest.
 */
export function useWalletBalanceBootstrap(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    const userData = localStorage.getItem('user');
    if (!userData) return undefined;

    const timerId = window.setTimeout(async () => {
      try {
        const res = await getBalance();
        if (res.success && res.data?.balance != null) {
          updateUserBalance(res.data.balance);
        }
      } catch (_) {}
    }, BOOTSTRAP_DELAY_MS);

    return () => window.clearTimeout(timerId);
  }, [enabled]);
}

export default useWalletBalanceBootstrap;
