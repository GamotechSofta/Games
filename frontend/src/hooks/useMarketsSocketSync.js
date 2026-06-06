import { useEffect } from 'react';
import { startMarketsSocketSync, stopMarketsSocketSync } from '../services/marketsSocketSync';

/**
 * Event-driven market result sync via Socket.IO (admin declare → instant refetch).
 * Shared socket stays open for click-to-call; no polling.
 */
export function useMarketsSocketSync(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    startMarketsSocketSync();
    return () => {
      stopMarketsSocketSync();
    };
  }, [enabled]);
}

export default useMarketsSocketSync;
