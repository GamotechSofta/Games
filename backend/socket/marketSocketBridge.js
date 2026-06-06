import { getWalletSocketIo } from './walletSocketBridge.js';

/**
 * Broadcast market result changes to all connected player clients.
 * @param {{ marketId?: string, marketType?: string, reason?: string }} payload
 */
export function emitMarketsUpdated(payload = {}) {
  const io = getWalletSocketIo();
  if (!io) return;

  io.emit('markets:updated', {
    ts: Date.now(),
    marketId: payload.marketId != null ? String(payload.marketId) : undefined,
    marketType: payload.marketType || 'main',
    reason: payload.reason || 'result_updated',
  });
}
