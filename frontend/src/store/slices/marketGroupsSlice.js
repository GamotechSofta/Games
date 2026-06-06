import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../config/api';
import fetchNoStore from '../../utils/fetchNoStore';

const STALE_MS = 5 * 60 * 1000;

async function fetchGroups(type) {
  const path = type === 'king' ? 'king-bazaar-groups' : 'starline-groups';
  const res = await fetchNoStore(`${API_BASE_URL}/markets/${path}`);
  const data = await res.json();
  if (!res.ok || !data?.success) {
    throw new Error(data?.message || 'Failed to load markets');
  }
  return Array.isArray(data.data) ? data.data : [];
}

export const fetchMarketGroupsThunk = createAsyncThunk(
  'marketGroups/fetch',
  async (arg, { rejectWithValue }) => {
    const type = typeof arg === 'string' ? arg : arg?.type;
    try {
      return { type, groups: await fetchGroups(type) };
    } catch (err) {
      return rejectWithValue({ type, message: err?.message || 'Failed to load markets' });
    }
  },
  {
    condition: (arg, { getState }) => {
      const type = typeof arg === 'string' ? arg : arg?.type;
      const force = typeof arg === 'object' && Boolean(arg?.force);
      if (force) return true;
      const bucket = getState().marketGroups.byType[type];
      if (!bucket) return true;
      if (bucket.status === 'loading') return false;
      if (bucket.status === 'succeeded' && bucket.lastFetchedAt && Date.now() - bucket.lastFetchedAt < STALE_MS) {
        return false;
      }
      return true;
    },
  },
);

const emptyBucket = () => ({
  groups: [],
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const marketGroupsSlice = createSlice({
  name: 'marketGroups',
  initialState: {
    byType: {
      starline: emptyBucket(),
      king: emptyBucket(),
    },
  },
  reducers: {
    clearMarketGroups(state) {
      state.byType.starline = emptyBucket();
      state.byType.king = emptyBucket();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMarketGroupsThunk.pending, (state, action) => {
        const type = typeof action.meta.arg === 'string' ? action.meta.arg : action.meta.arg?.type;
        if (!state.byType[type]) state.byType[type] = emptyBucket();
        state.byType[type].status = 'loading';
        state.byType[type].error = null;
      })
      .addCase(fetchMarketGroupsThunk.fulfilled, (state, action) => {
        const { type, groups } = action.payload;
        if (!state.byType[type]) state.byType[type] = emptyBucket();
        state.byType[type].groups = groups;
        state.byType[type].status = 'succeeded';
        state.byType[type].lastFetchedAt = Date.now();
      })
      .addCase(fetchMarketGroupsThunk.rejected, (state, action) => {
        const type = action.payload?.type || action.meta.arg;
        if (!state.byType[type]) state.byType[type] = emptyBucket();
        state.byType[type].status = 'failed';
        state.byType[type].error = action.payload?.message || 'Failed to load markets';
      });
  },
});

export const { clearMarketGroups } = marketGroupsSlice.actions;

export const selectMarketGroups = (type) => (state) =>
  state.marketGroups.byType[type]?.groups || [];

export const selectMarketGroupsStatus = (type) => (state) => {
  const bucket = state.marketGroups.byType[type] || emptyBucket();
  return {
    loading: bucket.status === 'loading' || bucket.status === 'idle',
    error: bucket.error,
  };
};

export default marketGroupsSlice.reducer;
