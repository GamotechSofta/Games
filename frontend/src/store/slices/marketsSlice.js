import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import { fetchMainMarkets } from '../../api/mainMarkets';

const STALE_MS = 60 * 1000;

export const fetchMainMarketsThunk = createAsyncThunk(
  'markets/fetchMain',
  async (popularOnly = false, { rejectWithValue }) => {
    try {
      return await fetchMainMarkets(popularOnly);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load markets');
    }
  },
  {
    condition: (popularOnly, { getState }) => {
      const key = popularOnly ? 'popular' : 'all';
      const slice = getState().markets.byFilter[key];
      if (slice.status === 'loading') return false;
      if (slice.status === 'succeeded' && slice.lastFetchedAt && Date.now() - slice.lastFetchedAt < STALE_MS) {
        return false;
      }
      return true;
    },
  },
);

const emptyBucket = () => ({
  items: [],
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const marketsSlice = createSlice({
  name: 'markets',
  initialState: {
    byFilter: {
      all: emptyBucket(),
      popular: emptyBucket(),
    },
  },
  reducers: {
    clearMarkets(state) {
      state.byFilter.all = emptyBucket();
      state.byFilter.popular = emptyBucket();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMainMarketsThunk.pending, (state, action) => {
        const k = action.meta.arg ? 'popular' : 'all';
        state.byFilter[k].status = 'loading';
        state.byFilter[k].error = null;
      })
      .addCase(fetchMainMarketsThunk.fulfilled, (state, action) => {
        const k = action.meta.arg ? 'popular' : 'all';
        state.byFilter[k].items = action.payload;
        state.byFilter[k].status = 'succeeded';
        state.byFilter[k].lastFetchedAt = Date.now();
      })
      .addCase(fetchMainMarketsThunk.rejected, (state, action) => {
        const k = action.meta.arg ? 'popular' : 'all';
        state.byFilter[k].status = 'failed';
        state.byFilter[k].error = action.payload || 'Failed to load markets';
      });
  },
});

export const { clearMarkets } = marketsSlice.actions;

export const selectMainMarkets = (popularOnly = false) => (state) => {
  const key = popularOnly ? 'popular' : 'all';
  return state.markets.byFilter[key].items;
};

const selectAllMarketsBucket = (state) => state.markets.byFilter.all;
const selectPopularMarketsBucket = (state) => state.markets.byFilter.popular;

const marketsStatusFromBucket = (bucket) => ({
  loading: bucket.status === 'loading' || bucket.status === 'idle',
  error: bucket.error,
  status: bucket.status,
});

const allMarketsStatusSelector = createSelector(selectAllMarketsBucket, marketsStatusFromBucket);
const popularMarketsStatusSelector = createSelector(selectPopularMarketsBucket, marketsStatusFromBucket);

export const selectMainMarketsStatus = (popularOnly = false) =>
  popularOnly ? popularMarketsStatusSelector : allMarketsStatusSelector;

export default marketsSlice.reducer;
