import { prefetchHomeBootstrap } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

let prefetchInFlight = null;

/** Deduped session prefetch — avoids 3x parallel bootstrap calls on login/mount. */
export function prefetchPlayerSessionData() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.id && !user?._id) return Promise.resolve();

  if (prefetchInFlight) return prefetchInFlight;

  prefetchInFlight = Promise.all([
    prefetchHomeBootstrap(),
    prefetchMyBetsBootstrap(),
    prefetchSpecialMarketGroups(),
  ]).finally(() => {
    prefetchInFlight = null;
  });

  return prefetchInFlight;
}
