import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getMyBetHistory, getRatesCurrent } from '../../api/bets';

const STALE_MS = 60 * 1000;

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

export const fetchMyBetsDataThunk = createAsyncThunk(
  'myBets/fetch',
  async ({ days = 30, limit = 200 } = {}, { rejectWithValue }) => {
    try {
      const [betsRes, ratesRes] = await Promise.all([
        getMyBetHistory({ days, limit }),
        getRatesCurrent(),
      ]);
      if (!betsRes?.success) {
        return rejectWithValue(betsRes?.message || 'Failed to load bet history');
      }
      if (!ratesRes?.success) {
        return rejectWithValue(ratesRes?.message || 'Failed to load rates');
      }
      const bets = Array.isArray(betsRes.data) ? betsRes.data : [];
      return {
        bets,
        rates: ratesRes.data || null,
        markets: marketsFromBets(bets),
      };
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load my bets data');
    }
  },
  {
    condition: (_, { getState }) => {
      const { status, lastFetchedAt } = getState().myBets;
      if (status === 'loading') return false;
      if (status === 'succeeded' && lastFetchedAt && Date.now() - lastFetchedAt < STALE_MS) {
        return false;
      }
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
    status: 'idle',
    error: null,
    lastFetchedAt: null,
  },
  reducers: {
    clearMyBets(state) {
      state.bets = [];
      state.rates = null;
      state.markets = [];
      state.status = 'idle';
      state.error = null;
      state.lastFetchedAt = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyBetsDataThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchMyBetsDataThunk.fulfilled, (state, action) => {
        state.bets = action.payload.bets;
        state.rates = action.payload.rates;
        state.markets = action.payload.markets;
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchMyBetsDataThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load my bets data';
      });
  },
});

export const { clearMyBets } = myBetsSlice.actions;

export const selectMyBets = (state) => state.myBets.bets;
export const selectMyBetsRates = (state) => state.myBets.rates;
export const selectMyBetsMarkets = (state) => state.myBets.markets;
export const selectMyBetsStatus = (state) => ({
  loading: state.myBets.status === 'loading' || state.myBets.status === 'idle',
  isFetching: state.myBets.status === 'loading',
  error: state.myBets.error,
});

export default myBetsSlice.reducer;
