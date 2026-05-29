import { prefetchHomeBootstrap, prefetchMainMarkets } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Markets, home, and bet history up front; starline/king groups when idle. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  void prefetchHomeBootstrap();
  void prefetchMyBetsBootstrap();

  const deferHeavy = () => {
    void prefetchSpecialMarketGroups();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferHeavy, { timeout: 3000 });
  } else {
    setTimeout(deferHeavy, 1200);
  }
}
