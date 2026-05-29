import { prefetchHomeBootstrap } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Home data first; heavy bet/group prefetches after navigation so login feels instant. */
export function schedulePostLoginPrefetch() {
  void prefetchHomeBootstrap();

  const deferHeavy = () => {
    void prefetchMyBetsBootstrap();
    void prefetchSpecialMarketGroups();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferHeavy, { timeout: 3000 });
  } else {
    setTimeout(deferHeavy, 1200);
  }
}
