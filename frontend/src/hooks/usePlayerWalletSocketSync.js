import { useEffect } from 'react';
import { updateUserBalance } from '../api/bets';
import { attachPlayerWalletSocket } from '../lib/playerWalletSocket';
import { acquirePlayerSocket, getPlayerSocket, releasePlayerSocket } from '../services/playerSocket';

/**
 * Keeps player wallet in sync via Socket.IO (shared socket with call signaling).
 */
export function usePlayerWalletSocketSync(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;

    acquirePlayerSocket();
    const socket = getPlayerSocket();
    if (!socket) {
      releasePlayerSocket();
      return undefined;
    }

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
      releasePlayerSocket();
    };
  }, [enabled]);
}
