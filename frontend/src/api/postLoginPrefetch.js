import { prefetchHomeBootstrap, prefetchMainMarkets } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Markets + home bootstrap first; heavy bet/group prefetches when idle. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
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
