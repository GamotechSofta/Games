import { refetchAllMarketData } from './marketsDataSync';
import { acquirePlayerSocket, connectPlayerSocket, getPlayerSocket } from './playerSocket';
import { startMarketsLiveStream, stopMarketsLiveStream, isMarketsLiveStreamOpen } from './marketsLiveStream';
import {
  startMarketsRevisionFallback,
  stopMarketsRevisionFallback,
  notifyRevisionHandled,
  isRevisionPollActive,
} from './marketsRevisionFallback';

let started = false;
let detachSocket = null;
let hadConnected = false;
let lastHandledTs = 0;
let socketConnected = false;

function isRealtimeHealthy() {
  return socketConnected || isMarketsLiveStreamOpen();
}

function handleMarketsUpdated(payload = {}) {
  const ts = Number(payload?.ts) || Date.now();
  if (ts <= lastHandledTs) return;
  lastHandledTs = ts;
  notifyRevisionHandled(ts);
  void refetchAllMarketData(payload);
}

function subscribeMarkets(socket) {
  if (!socket?.connected) return;
  socket.emit('markets:subscribe');
}

function attachToSocket(socket) {
  const handler = (payload) => {
    handleMarketsUpdated(payload || {});
  };

  const onConnect = () => {
    socketConnected = true;
    subscribeMarkets(socket);
    if (hadConnected) {
      handleMarketsUpdated({ reason: 'socket_reconnect', marketType: 'all', ts: Date.now() });
    }
    hadConnected = true;
  };

  const onDisconnect = () => {
    socketConnected = false;
  };

  socket.on('markets:updated', handler);
  socket.on('connect', onConnect);
  socket.on('disconnect', onDisconnect);

  if (socket.connected) {
    socketConnected = true;
    hadConnected = true;
    subscribeMarkets(socket);
  }

  return () => {
    socket.off('markets:updated', handler);
    socket.off('connect', onConnect);
    socket.off('disconnect', onDisconnect);
    socketConnected = false;
  };
}

/**
 * Real-time market sync: Socket.IO + SSE + revision poll fallback (production).
 */
export function startMarketsSocketSync() {
  if (started) return stopMarketsSocketSync;

  connectPlayerSocket();
  acquirePlayerSocket();

  const socket = getPlayerSocket();
  if (socket) {
    detachSocket = attachToSocket(socket);
  }

  startMarketsLiveStream(handleMarketsUpdated);
  startMarketsRevisionFallback(handleMarketsUpdated, { isRealtimeHealthy });

  started = true;
  return stopMarketsSocketSync;
}

export function stopMarketsSocketSync() {
  if (detachSocket) {
    detachSocket();
    detachSocket = null;
  }
  stopMarketsLiveStream();
  stopMarketsRevisionFallback();
  started = false;
  hadConnected = false;
  lastHandledTs = 0;
  socketConnected = false;
}

export function isMarketsSocketSyncActive() {
  return started;
}

export function getMarketsSyncStatus() {
  return {
    started,
    socketConnected,
    sseOpen: isMarketsLiveStreamOpen(),
    revisionPoll: isRevisionPollActive(),
    lastHandledTs,
  };
}
