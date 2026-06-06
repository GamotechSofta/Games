/** @type {Set<import('express').Response>} */
const sseClients = new Set();

/**
 * @param {import('express').Response} res
 */
export function addMarketSseClient(res) {
  sseClients.add(res);
}

/**
 * @param {import('express').Response} res
 */
export function removeMarketSseClient(res) {
  sseClients.delete(res);
}

/**
 * Push market update to all SSE subscribers (production fallback when WebSocket is blocked).
 * @param {object} payload
 */
export function broadcastMarketSse(payload = {}) {
  if (!sseClients.size) return;
  const line = `data: ${JSON.stringify(payload)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

export function getMarketSseClientCount() {
  return sseClients.size;
}
