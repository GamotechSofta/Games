import { getWalletSocketIo } from './walletSocketBridge.js';
import { getPlayerSocketIo } from './playerSocket.js';

/**
 * Broadcast market result changes to all connected player clients.
 * @param {{ marketId?: string, marketType?: string, reason?: string }} payload
 */
export function emitMarketsUpdated(payload = {}) {
  const io = getPlayerSocketIo() || getWalletSocketIo();
  if (!io) {
    console.warn('[socket] markets:updated skipped — Socket.IO not initialized');
    return;
  }

  const event = {
    ts: Date.now(),
    marketId: payload.marketId != null ? String(payload.marketId) : undefined,
    marketType: payload.marketType || 'main',
    reason: payload.reason || 'result_updated',
  };

  io.emit('markets:updated', event);
}
