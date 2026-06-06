/**
 * Listen for server-pushed market result updates (admin declare → instant refetch).
 * @param {import('socket.io-client').Socket} socket
 * @param {(payload: object) => void} onMarketsUpdated
 */
export function attachMarketsSocket(socket, onMarketsUpdated) {
  if (!socket || typeof onMarketsUpdated !== 'function') {
    return () => {};
  }

  const handler = (payload) => {
    onMarketsUpdated(payload || {});
  };

  socket.on('markets:updated', handler);

  return () => {
    socket.off('markets:updated', handler);
  };
}
