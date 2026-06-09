import { store } from '../store';
import {
  fetchMyBetsDataThunk,
  MY_BETS_PAGE_SIZE,
  prependPlacedBets,
} from '../store/slices/myBetsSlice';
import { clearBetHistorySessionCache } from './userDataCache';

function findMarketInStore(marketId) {
  const id = String(marketId || '');
  if (!id) return null;
  const state = store.getState();
  for (const m of state.myBets?.markets || []) {
    if (String(m._id) === id) return m;
  }
  for (const bucket of Object.values(state.markets?.byFilter || {})) {
    const hit = (bucket.items || []).find((m) => String(m._id || m.id) === id);
    if (hit) return hit;
  }
  return null;
}

function buildOptimisticPlacedBets({
  userId,
  marketId,
  betIds,
  betsPayload,
  scheduledDate,
}) {
  const market = findMarketInStore(marketId);
  const marketField = market
    ? {
      _id: market._id || market.id || marketId,
      marketName: market.marketName || market.gameName || 'MARKET',
      marketType: market.marketType,
      closingTime: market.closingTime,
      startingTime: market.startingTime,
      openingNumber: market.openingNumber,
      closingNumber: market.closingNumber,
    }
    : { _id: marketId, marketName: 'MARKET' };
  const now = new Date().toISOString();
  return betIds.map((id, i) => {
    const b = betsPayload[i] || {};
    return {
      _id: id,
      userId,
      marketId: marketField,
      betType: b.betType,
      betNumber: String(b.betNumber || ''),
      amount: Number(b.amount) || 0,
      betOn: b.betOn || 'open',
      status: 'pending',
      payout: 0,
      createdAt: now,
      scheduledDate: scheduledDate || null,
      isScheduled: Boolean(scheduledDate),
    };
  });
}

/** Prepend new bets to Redux instantly, then background-sync from API. */
export function syncBetHistoryAfterPlace({
  userId,
  bets,
  betIds,
  marketId,
  betsPayload,
  scheduledDate,
}) {
  if (userId) clearBetHistorySessionCache(userId);

  if (Array.isArray(bets) && bets.length) {
    store.dispatch(prependPlacedBets(bets));
  } else if (Array.isArray(betIds) && betIds.length && Array.isArray(betsPayload)) {
    store.dispatch(prependPlacedBets(buildOptimisticPlacedBets({
      userId,
      marketId,
      betIds,
      betsPayload,
      scheduledDate,
    })));
  }

  if (userId) {
    void store.dispatch(fetchMyBetsDataThunk({
      days: 30,
      limit: MY_BETS_PAGE_SIZE,
      skip: 0,
      append: false,
      force: true,
    }));
  }

  try {
    window.dispatchEvent(new CustomEvent('betsPlaced', { detail: { userId, betIds } }));
  } catch {
    /* ignore */
  }
}

export default syncBetHistoryAfterPlace;
