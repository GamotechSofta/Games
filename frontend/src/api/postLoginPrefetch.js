import { prefetchMainMarkets, prefetchWalletBalance } from './prefetchHome';
import { prefetchMyBetsData } from './prefetchBets';
import { prefetchBankAccounts, prefetchFundsHistory, prefetchPaymentConfig } from './prefetchPayments';
import { prefetchSpecialMarketChunks, prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Separate API prefetches after login. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  void prefetchWalletBalance();
  void prefetchPaymentConfig();
  void prefetchBankAccounts();
  prefetchSpecialMarketChunks();

  const deferHeavy = () => {
    void prefetchFundsHistory();
    void prefetchMyBetsData();
    void prefetchSpecialMarketGroups();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferHeavy, { timeout: 3000 });
  } else {
    setTimeout(deferHeavy, 800);
  }
}
