import { emitMarketsUpdated } from '../socket/marketSocketBridge.js';

export function normalizeMarketTypeForNotify(market) {
  const t = (market?.marketType || '').toString().toLowerCase();
  if (t === 'startline') return 'startline';
  if (t === 'king') return 'king';
  return 'main';
}

/**
 * Notify player apps that a market result changed (declare open/close, manual set, clear).
 * @param {object} market - Mongoose doc or lean object with _id and marketType
 * @param {string} reason
 */
export function notifyMarketsResultUpdated(market, reason = 'result_updated') {
  if (!market) return;
  const marketId = market._id?.toString?.() || market.id?.toString?.();
  emitMarketsUpdated({
    marketId,
    marketType: normalizeMarketTypeForNotify(market),
    reason,
  });
}

/** Midnight IST reset — all market types. */
export function notifyAllMarketsReset(reason = 'midnight_reset') {
  emitMarketsUpdated({ marketType: 'all', reason });
}
