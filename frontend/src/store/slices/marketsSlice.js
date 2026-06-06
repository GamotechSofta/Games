import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import { fetchMainMarkets } from '../../api/mainMarkets';

function parseFetchArg(arg) {
  if (typeof arg === 'boolean') return { popularOnly: arg, force: false };
  if (arg && typeof arg === 'object') {
    return {
      popularOnly: Boolean(arg.popularOnly),
      force: Boolean(arg.force),
    };
  }
  return { popularOnly: false, force: false };
}

function bucketKey(popularOnly) {
  return popularOnly ? 'popular' : 'all';
}

export const fetchMainMarketsThunk = createAsyncThunk(
  'markets/fetchMain',
  async (arg, { rejectWithValue }) => {
    const { popularOnly } = parseFetchArg(arg);
    try {
      return await fetchMainMarkets(popularOnly);
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load markets');
    }
  },
  {
    condition: (arg, { getState }) => {
      const { popularOnly, force } = parseFetchArg(arg);
      const key = bucketKey(popularOnly);
      const slice = getState().markets.byFilter[key];
      if (slice.status === 'loading') return false;
      if (force) return true;
      // Event-driven cache: keep data until opening / closure / closing / midnight refresh.
      if (slice.status === 'succeeded' && slice.items.length > 0) return false;
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
        const { popularOnly } = parseFetchArg(action.meta.arg);
        const k = bucketKey(popularOnly);
        state.byFilter[k].status = 'loading';
        state.byFilter[k].error = null;
      })
      .addCase(fetchMainMarketsThunk.fulfilled, (state, action) => {
        const { popularOnly } = parseFetchArg(action.meta.arg);
        const k = bucketKey(popularOnly);
        state.byFilter[k].items = action.payload;
        state.byFilter[k].status = 'succeeded';
        state.byFilter[k].lastFetchedAt = Date.now();
      })
      .addCase(fetchMainMarketsThunk.rejected, (state, action) => {
        const { popularOnly } = parseFetchArg(action.meta.arg);
        const k = bucketKey(popularOnly);
        state.byFilter[k].status = 'failed';
        state.byFilter[k].error = action.payload || 'Failed to load markets';
      });
  },
});

export const { clearMarkets } = marketsSlice.actions;

export const selectMainMarkets = (popularOnly = false) => (state) => {
  const key = bucketKey(popularOnly);
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
