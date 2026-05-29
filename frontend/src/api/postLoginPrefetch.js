import { prefetchMainMarkets, prefetchWalletBalance } from './prefetchHome';
import { prefetchMyBetsData } from './prefetchBets';
import { prefetchBankAccounts, prefetchFundsHistory, prefetchPaymentConfig } from './prefetchPayments';
import { prefetchSpecialMarketChunks, prefetchSpecialMarketGroups } from './prefetchSpecialMarkets';

/** Separate API prefetches after login — staggered so UI stays responsive. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  prefetchSpecialMarketChunks();

  const deferMedium = () => {
    void prefetchPaymentConfig();
    void prefetchBankAccounts();
    void prefetchWalletBalance();
  };

  const deferHeavy = () => {
    void prefetchFundsHistory();
    void prefetchMyBetsData();
    void prefetchSpecialMarketGroups();
  };

  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(deferMedium, { timeout: 1200 });
    window.requestIdleCallback(deferHeavy, { timeout: 4000 });
  } else {
    setTimeout(deferMedium, 400);
    setTimeout(deferHeavy, 1500);
  }
}
