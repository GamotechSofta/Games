import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMyBetHistory, getRatesCurrent } from '../../api/bets';

export const MY_BETS_PAGE_SIZE = 50;

function parseFetchArg(arg) {
  if (arg && typeof arg === 'object') {
    return {
      days: arg.days ?? 30,
      limit: arg.limit ?? MY_BETS_PAGE_SIZE,
      skip: arg.skip ?? 0,
      append: Boolean(arg.append),
      force: Boolean(arg.force),
    };
  }
  return { days: 30, limit: MY_BETS_PAGE_SIZE, skip: 0, append: false, force: false };
}

function marketsFromBets(bets) {
  const map = new Map();
  for (const bet of bets || []) {
    const m = bet.marketId;
    if (m && typeof m === 'object' && m._id) {
      map.set(String(m._id), m);
    }
  }
  return Array.from(map.values());
}

function mergeBets(existing, incoming) {
  const seen = new Set((existing || []).map((b) => String(b._id)));
  const merged = [...(existing || [])];
  for (const bet of incoming || []) {
    const id = String(bet._id);
    if (!seen.has(id)) {
      seen.add(id);
      merged.push(bet);
    }
  }
  return merged;
}

export const fetchMyBetsDataThunk = createAsyncThunk(
  'myBets/fetch',
  async (arg, { rejectWithValue }) => {
    const { days, limit, skip, append, force } = parseFetchArg(arg);
    try {
      const [betsRes, ratesRes] = await Promise.all([
        getMyBetHistory({ days, limit, skip, force }),
        skip === 0 && !append
          ? getRatesCurrent({ force })
          : Promise.resolve({ success: true, data: null }),
      ]);
      if (!betsRes?.success) {
        return rejectWithValue(betsRes?.message || 'Failed to load bet history');
      }
      if (skip === 0 && !append && !ratesRes?.success) {
        return rejectWithValue(ratesRes?.message || 'Failed to load rates');
      }
      const bets = Array.isArray(betsRes.data) ? betsRes.data : [];
      return {
        bets,
        rates: ratesRes.data || null,
        markets: marketsFromBets(bets),
        hasMore: Boolean(betsRes.hasMore),
        append,
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load my bets data');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { append, force } = parseFetchArg(arg);
      if (force || append) return true;
      const { status, bets } = getState().myBets;
      if (status === 'loading') return false;
      if (status === 'succeeded' && bets.length > 0) return false;
      return true;
    },
  },
);

/** @deprecated use fetchMyBetsDataThunk */
export const fetchMyBetsBootstrapThunk = fetchMyBetsDataThunk;

const myBetsSlice = createSlice({
  name: 'myBets',
  initialState: {
    bets: [],
    rates: null,
    markets: [],
    hasMore: false,
    status: 'idle',
    error: null,
    lastFetchedAt: null,
  },
  reducers: {
    clearMyBets(state) {
      state.bets = [];
      state.rates = null;
      state.markets = [];
      state.hasMore = false;
      state.status = 'idle';
      state.error = null;
      state.lastFetchedAt = null;
    },
    patchBetStatus(state, action) {
      const betId = String(action.payload?.betId || '');
      const status = action.payload?.status;
      if (!betId || !status) return;
      const idx = state.bets.findIndex((b) => String(b._id) === betId);
      if (idx < 0) return;
      state.bets[idx] = { ...state.bets[idx], status };
    },
    prependPlacedBets(state, action) {
      const incoming = Array.isArray(action.payload) ? action.payload : [];
      if (!incoming.length) return;
      const existingIds = new Set(state.bets.map((b) => String(b._id)));
      const toAdd = incoming.filter((b) => b?._id && !existingIds.has(String(b._id)));
      if (!toAdd.length) return;
      state.bets = [...toAdd, ...state.bets];
      const marketMap = new Map((state.markets || []).map((m) => [String(m._id), m]));
      for (const bet of toAdd) {
        const m = bet.marketId;
        if (m && typeof m === 'object' && m._id) {
          marketMap.set(String(m._id), m);
        }
      }
      state.markets = Array.from(marketMap.values());
      state.status = 'succeeded';
      state.lastFetchedAt = Date.now();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBetsDataThunk.pending, (state, action) => {
        state.status = 'loading';
        state.error = null;
        if (!action.meta.arg?.append) {
          state.hasMore = false;
        }
      })
      .addCase(fetchMyBetsDataThunk.fulfilled, (state, action) => {
        const { bets, rates, markets, hasMore, append } = action.payload;
        if (append) {
          state.bets = mergeBets(state.bets, bets);
          const marketMap = new Map((state.markets || []).map((m) => [String(m._id), m]));
          for (const m of markets || []) marketMap.set(String(m._id), m);
          state.markets = Array.from(marketMap.values());
        } else {
          state.bets = bets;
          state.markets = markets;
          if (rates) state.rates = rates;
        }
        state.hasMore = hasMore;
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchMyBetsDataThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load my bets data';
      });
  },
});

export const { clearMyBets, patchBetStatus, prependPlacedBets } = myBetsSlice.actions;

export const selectMyBets = (state) => state.myBets.bets;
export const selectMyBetsRates = (state) => state.myBets.rates;
export const selectMyBetsMarkets = (state) => state.myBets.markets;
export const selectMyBetsHasMore = (state) => state.myBets.hasMore;
export const selectMyBetsStatus = (state) => ({
  loading: state.myBets.status === 'loading' || state.myBets.status === 'idle',
  isFetching: state.myBets.status === 'loading',
  error: state.myBets.error,
});

export default myBetsSlice.reducer;
