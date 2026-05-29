import { prefetchSpecialMarketsBootstrap } from './specialMarketsBootstrap';

/** Warm Starline + King Bazaar groups and all slots (one API round-trip). */
export function prefetchSpecialMarketGroups() {
  void prefetchSpecialMarketsBootstrap();
}

/** Preload route chunks for instant navigation. */
export function prefetchSpecialMarketChunks() {
  void import('../pages/StartlineDashboard');
  void import('../pages/StarlineMarket');
  void import('../pages/KingBazaarMarket');
}
