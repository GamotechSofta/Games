import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { getBalance, updateUserBalance } from '../api/bets';
import { clearUserAuth } from '../utils/auth';
import { storage } from '../utils/storage';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;

export const useHeartbeat = () => {
  const intervalRef = useRef(null);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const userStr = await storage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const userId = user?.id || user?._id;
        if (!userId) return;
        const res = await fetch(`${API_BASE_URL}/users/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        const data = await res.json();
        if (res.status === 401 || res.status === 403 || (!data.success && data.code === 'ACCOUNT_SUSPENDED')) {
          clearUserAuth();
        }
      } catch (_) {}
    };

    let subscription;
    const init = async () => {
      const userStr = await storage.getItem('user');
      if (!userStr) return;
      sendHeartbeat();
      intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
    };
    init();

    const refreshBalance = async () => {
      try {
        const res = await getBalance();
        if (res.success && res.data?.balance != null) await updateUserBalance(res.data.balance);
      } catch (_) {}
    };

    const handleAppState = (nextState) => {
      if (nextState === 'active') {
        sendHeartbeat();
        refreshBalance();
      }
    };
    subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      subscription?.remove?.();
    };
  }, []);
};
