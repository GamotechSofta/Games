import { prefetchMainMarkets } from './prefetchHome';
import { prefetchMyBetsData } from './prefetchBets';
import { prefetchBankAccounts, prefetchFundsHistory, prefetchPaymentConfig } from './prefetchPayments';
import { prefetchSpecialMarketChunks } from './prefetchSpecialMarkets';

const BIDS_PATHS = new Set([
  '/bids',
  '/bet-history',
  '/starline-bet-history',
  '/king-bazaar-bet-history',
  '/market-result-history',
]);

const FUNDS_PATHS = new Set(['/funds', '/passbook', '/bank', '/wallet']);

function defer(fn, timeout = 2000) {
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    window.requestIdleCallback(fn, { timeout });
  } else {
    setTimeout(fn, Math.min(timeout, 600));
  }
}

/** Home-critical only — avoids login burst of bets, payments, and funds history. */
export function schedulePostLoginPrefetch() {
  void prefetchMainMarkets();
  defer(() => prefetchSpecialMarketChunks(), 1500);
}

/** Warm my-bets data when user opens a bets/history route. */
export function scheduleBidsPrefetch() {
  defer(() => void prefetchMyBetsData(), 600);
}

/** Warm payment data when user opens funds/wallet routes. */
export function scheduleFundsPrefetch() {
  defer(() => {
    void prefetchPaymentConfig();
    void prefetchBankAccounts();
    void prefetchFundsHistory();
  }, 600);
}

export function prefetchForPathname(pathname = '') {
  const path = String(pathname || '');
  if (BIDS_PATHS.has(path)) scheduleBidsPrefetch();
  if (FUNDS_PATHS.has(path)) scheduleFundsPrefetch();
}
