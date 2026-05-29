import { prefetchHomeBootstrap, prefetchMainMarkets } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchBankAccounts, prefetchFundsHistory, prefetchPaymentConfig } from './prefetchPayments';
import { prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Markets, home, bets, and payment limits up front; starline/king groups when idle. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  void prefetchHomeBootstrap();
  void prefetchMyBetsBootstrap();
  void prefetchPaymentConfig();
  void prefetchBankAccounts();

  const deferHeavy = () => {
    void prefetchFundsHistory();
    void prefetchSpecialMarketGroups();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferHeavy, { timeout: 3000 });
  } else {
    setTimeout(deferHeavy, 1200);
  }
}
