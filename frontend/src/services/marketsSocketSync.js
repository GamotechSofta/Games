import { refetchAllMarketData } from './marketsDataSync';
import { acquirePlayerSocket, connectPlayerSocket, getPlayerSocket } from './playerSocket';

let started = false;
let detachSocket = null;
let hadConnected = false;

function attachToSocket(socket) {
  const handler = (payload) => {
    void refetchAllMarketData(payload || {});
  };

  const onConnect = () => {
    if (hadConnected) {
      void refetchAllMarketData({ reason: 'socket_reconnect', marketType: 'all' });
    }
    hadConnected = true;
  };

  socket.on('markets:updated', handler);
  socket.on('connect', onConnect);
  if (socket.connected) {
    hadConnected = true;
  }

  return () => {
    socket.off('markets:updated', handler);
    socket.off('connect', onConnect);
  };
}

/**
 * One app-wide listener: admin declare → instant market refetch everywhere.
 * Does not disconnect the shared socket on stop (call signaling may still use it).
 */
export function startMarketsSocketSync() {
  if (started) return stopMarketsSocketSync;

  connectPlayerSocket();
  acquirePlayerSocket();

  const socket = getPlayerSocket();
  if (!socket) {
    return stopMarketsSocketSync;
  }

  detachSocket = attachToSocket(socket);
  started = true;

  return stopMarketsSocketSync;
}

export function stopMarketsSocketSync() {
  if (detachSocket) {
    detachSocket();
    detachSocket = null;
  }
  started = false;
  hadConnected = false;
}
