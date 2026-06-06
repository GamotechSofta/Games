import { useEffect } from 'react';
import { startMarketsSocketSync, stopMarketsSocketSync } from '../services/marketsSocketSync';

/**
 * Event-driven market result sync via Socket.IO (admin declare → instant refetch).
 * Starts at app shell level; stays active for the whole session.
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
