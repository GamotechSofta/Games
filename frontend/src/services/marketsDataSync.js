import { store } from '../store/index';
import { queryClient } from '../queryClient';
import { fetchMainMarketsThunk } from '../store/slices/marketsSlice';
import { fetchSpecialSlotsThunk } from '../store/slices/specialSlotsSlice';
import { fetchMarketGroupsThunk } from '../store/slices/marketGroupsSlice';

/** Dispatched on window after Redux/query caches refresh from admin declare. */
export const MARKETS_UPDATED_EVENT = 'markets:data-refreshed';

function groupKeyFromEntry(entry) {
  return (entry?.key || entry?.marketKey || entry?._id || '').toString().trim().toLowerCase();
}

function queueSpecialSlotRefetches(state, slotType, groupQueryType, tasks) {
  const seen = new Set();

  const groups = state.marketGroups?.byType?.[groupQueryType]?.groups || [];
  for (const g of groups) {
    const groupKey = groupKeyFromEntry(g);
    if (!groupKey || seen.has(groupKey)) continue;
    seen.add(groupKey);
    tasks.push(store.dispatch(fetchSpecialSlotsThunk({
      marketType: slotType,
      groupKey,
      marketLabel: g.label || g.name || '',
      force: true,
    })));
  }

  const prefix = `${slotType}:`;
  for (const cacheKey of Object.keys(state.specialSlots?.byKey || {})) {
    if (!cacheKey.startsWith(prefix)) continue;
    const groupKey = cacheKey.slice(prefix.length);
    if (!groupKey || seen.has(groupKey)) continue;
    seen.add(groupKey);
    tasks.push(store.dispatch(fetchSpecialSlotsThunk({
      marketType: slotType,
      groupKey,
      marketLabel: '',
      force: true,
    })));
  }
}

/**
 * Instant refresh when admin declares/clears a result (Socket.IO `markets:updated`).
 * No polling — only runs on server push or IST midnight reset push.
 */
export async function refetchAllMarketData(payload = {}) {
  const marketType = (payload.marketType || 'main').toString().toLowerCase();
  const refreshMain = marketType === 'main' || marketType === 'all';
  const refreshStartline = marketType === 'startline' || marketType === 'all';
  const refreshKing = marketType === 'king' || marketType === 'all';

  const tasks = [];

  if (refreshMain) {
    tasks.push(store.dispatch(fetchMainMarketsThunk({ popularOnly: false, force: true })));
  }

  const state = store.getState();

  if (refreshStartline) {
    queueSpecialSlotRefetches(state, 'startline', 'starline', tasks);
    tasks.push(store.dispatch(fetchMarketGroupsThunk({ type: 'starline', force: true })));
  }

  if (refreshKing) {
    queueSpecialSlotRefetches(state, 'king', 'king', tasks);
    tasks.push(store.dispatch(fetchMarketGroupsThunk({ type: 'king', force: true })));
  }

  await Promise.allSettled(tasks);

  void queryClient.invalidateQueries({ queryKey: ['marketResultHistory'] });
  void queryClient.invalidateQueries({ queryKey: ['marketGroups'] });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(MARKETS_UPDATED_EVENT, { detail: payload }));
  }
}
