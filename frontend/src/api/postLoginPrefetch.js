import { prefetchHomeBootstrap, prefetchMainMarkets } from './prefetchHome';
import { prefetchMyBetsBootstrap } from './prefetchBets';
import { prefetchBankAccounts, prefetchFundsHistory, prefetchPaymentConfig } from './prefetchPayments';
import { prefetchSpecialMarketChunks, prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Markets, home, bets, starline/king bootstrap, and payment limits in parallel. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  void prefetchHomeBootstrap();
  void prefetchMyBetsBootstrap();
  void prefetchPaymentConfig();
  void prefetchBankAccounts();
  void prefetchSpecialMarketGroups();
  prefetchSpecialMarketChunks();

  const deferHeavy = () => {
    void prefetchFundsHistory();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferHeavy, { timeout: 3000 });
  } else {
    setTimeout(deferHeavy, 800);
  }
}
