import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { getSocketUrl } from '../config/api';
import { updateUserBalance } from '../api/bets';
import { attachPlayerWalletSocket } from '../lib/playerWalletSocket';

/**
 * Keeps player wallet in sync via Socket.IO (replaces frequent balance polling).
 */
export function usePlayerWalletSocketSync(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const socketUrl = getSocketUrl();
    if (!socketUrl) return undefined;

    const socket = io(socketUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    const detachWallet = attachPlayerWalletSocket(socket);

    const onWalletUpdate = (payload) => {
      try {
        const raw = localStorage.getItem('user');
        const current = raw ? JSON.parse(raw) : {};
        const currentUserId = String(current?.id || current?._id || '').trim();
        const targetUserId = String(payload?.userId || '').trim();
        if (!currentUserId || !targetUserId || currentUserId !== targetUserId) return;
        const nextBalance = Number(payload?.balance);
        if (!Number.isFinite(nextBalance)) return;
        updateUserBalance(nextBalance);
      } catch (_) {}
    };

    socket.on('wallet:update', onWalletUpdate);

    return () => {
      detachWallet();
      socket.off('wallet:update', onWalletUpdate);
      socket.disconnect();
    };
  }, [enabled]);
}
