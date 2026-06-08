import { useEffect, useRef } from 'react';

import { subscribeMarketReset } from '../utils/marketResetScheduler';



/**

 * Auto-refreshes when IST date changes (market reset at midnight IST).

 * Uses one app-wide timer — safe to call from many components.

 * @param {() => void|Promise<void>} refetch - function to call when refresh is needed

 * @param {number} [intervalMs=60000] - check interval for date change (default 60 sec)

 */

export function useRefreshOnMarketReset(refetch, intervalMs = 60000) {

  const refetchRef = useRef(refetch);

  refetchRef.current = refetch;



  useEffect(() => {

    return subscribeMarketReset(() => {

      refetchRef.current?.();

    }, intervalMs);

  }, [intervalMs]);

}


