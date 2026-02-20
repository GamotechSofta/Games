import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getTodayIST } from '../utils/marketTiming';

/**
 * Auto-refreshes when IST date changes (market reset at midnight IST).
 * @param {() => void|Promise<void>} refetch
 * @param {number} [intervalMs=60000]
 */
export function useRefreshOnMarketReset(refetch, intervalMs = 60000) {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const lastDateKeyRef = useRef(null);

  useEffect(() => {
    const checkAndRefetch = () => {
      const today = getTodayIST();
      if (lastDateKeyRef.current !== null && lastDateKeyRef.current !== today) {
        refetchRef.current?.();
      }
      lastDateKeyRef.current = today;
    };

    lastDateKeyRef.current = getTodayIST();
    const interval = setInterval(checkAndRefetch, intervalMs);

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refetchRef.current?.();
        lastDateKeyRef.current = getTodayIST();
      }
    });

    return () => {
      clearInterval(interval);
      sub?.remove?.();
    };
  }, [intervalMs]);
}
