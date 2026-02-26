import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { API_BASE_URL } from '../config/api';
import { clearUserAuth } from '../utils/auth';
import { storage } from '../utils/storage';
import { emit } from '../utils/events';

const HEARTBEAT_INTERVAL_MS = 60 * 1000;
// Balance refresh is cheaper — do it more often but separately from heartbeat
const BALANCE_INTERVAL_MS = 30 * 1000;

export const useHeartbeat = () => {
  const heartbeatRef = useRef(null);
  const balanceRef = useRef(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

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
      } catch (_) { }
    };

    const refreshBalance = async () => {
      if (!isMountedRef.current) return;
      try {
        const userStr = await storage.getItem('user');
        if (!userStr) return;
        const user = JSON.parse(userStr);
        const userId = user?.id || user?._id;
        if (!userId) return;
        const res = await fetch(`${API_BASE_URL}/wallet/balance?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data?.success && data?.data?.balance != null) {
          const newBal = data.data.balance;
          // Update stored user object
          user.balance = newBal;
          await storage.setItem('user', JSON.stringify(user));
          // Push balance to UI without triggering a full userLogin cascade
          emit('balanceUpdated', newBal);
        }
      } catch (_) { }
    };

    const init = async () => {
      const userStr = await storage.getItem('user');
      if (!userStr) return;
      sendHeartbeat();
      refreshBalance();
      heartbeatRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
      balanceRef.current = setInterval(refreshBalance, BALANCE_INTERVAL_MS);
    };
    init();

    const handleAppState = (nextState) => {
      if (nextState === 'active') {
        sendHeartbeat();
        refreshBalance();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppState);

    return () => {
      isMountedRef.current = false;
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (balanceRef.current) clearInterval(balanceRef.current);
      subscription?.remove?.();
    };
  }, []);
};
