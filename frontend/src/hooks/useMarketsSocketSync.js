import { useEffect } from 'react';
import { attachMarketsSocket } from '../lib/marketsSocket';
import { acquirePlayerSocket, getPlayerSocket, releasePlayerSocket } from '../services/playerSocket';
import { store } from '../store/index';
import { fetchMainMarketsThunk } from '../store/slices/marketsSlice';
import { fetchSpecialSlotsThunk } from '../store/slices/specialSlotsSlice';

function refetchMarketsFromSocket(payload = {}) {
  const marketType = (payload.marketType || 'main').toString().toLowerCase();
  const refreshMain = marketType === 'main' || marketType === 'all';
  const refreshStartline = marketType === 'startline' || marketType === 'all';
  const refreshKing = marketType === 'king' || marketType === 'all';

  if (refreshMain) {
    void store.dispatch(fetchMainMarketsThunk({ popularOnly: false, force: true }));
  }

  const byKey = store.getState().specialSlots?.byKey || {};
  for (const key of Object.keys(byKey)) {
    if (refreshStartline && key.startsWith('startline:')) {
      const groupKey = key.slice('startline:'.length);
      void store.dispatch(fetchSpecialSlotsThunk({
        marketType: 'startline',
        groupKey,
        marketLabel: '',
        force: true,
      }));
    }
    if (refreshKing && key.startsWith('king:')) {
      const groupKey = key.slice('king:'.length);
      void store.dispatch(fetchSpecialSlotsThunk({
        marketType: 'king',
        groupKey,
        marketLabel: '',
        force: true,
      }));
    }
  }
}

/**
 * Event-driven market result sync: refetch only when admin declares / clears a result.
 */
export function useMarketsSocketSync(enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;

    acquirePlayerSocket();
    const socket = getPlayerSocket();
    if (!socket) {
      releasePlayerSocket();
      return undefined;
    }

    const detach = attachMarketsSocket(socket, refetchMarketsFromSocket);

    return () => {
      detach();
      releasePlayerSocket();
    };
  }, [enabled]);
}

export default useMarketsSocketSync;
