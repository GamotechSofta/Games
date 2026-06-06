import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config/api';
import { clearUserAuth } from '../utils/auth';

const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute – also used to detect suspended accounts
const MIN_VISIBILITY_INTERVAL_MS = 30 * 1000; // Throttle tab-focus requests to avoid 429

export const useHeartbeat = () => {
  const intervalRef = useRef(null);
  const lastVisibilityRef = useRef(0);

  useEffect(() => {
    const sendHeartbeat = async () => {
      try {
        const userData = localStorage.getItem('user');
        if (!userData) return;
        const user = JSON.parse(userData);
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
      } catch {
        // Silently ignore network errors
      }
    };

    const userData = localStorage.getItem('user');
    if (!userData) return;

    const initialDelayId = window.setTimeout(sendHeartbeat, 3000);
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - lastVisibilityRef.current < MIN_VISIBILITY_INTERVAL_MS) return;
      lastVisibilityRef.current = now;
      sendHeartbeat();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const handleLogout = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    window.addEventListener('userLogout', handleLogout);
    return () => {
      window.clearTimeout(initialDelayId);
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('userLogout', handleLogout);
    };
  }, []);
};
