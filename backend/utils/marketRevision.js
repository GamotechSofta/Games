/** @type {{ ts: number, marketId?: string, marketType?: string, reason?: string }} */
let revision = { ts: 0 };

export function bumpMarketRevision(payload = {}) {
  revision = {
    ts: Date.now(),
    marketId: payload.marketId != null ? String(payload.marketId) : revision.marketId,
    marketType: payload.marketType || revision.marketType || 'main',
    reason: payload.reason || 'result_updated',
  };
  return revision;
}

export function getMarketRevision() {
  return { ...revision };
}
