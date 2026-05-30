import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../config/api';
import {
  buildKingDemoSlots,
  mapKingBazaarSlot,
  mapStarlineSlot,
} from '../../utils/specialMarketSlots';

const STALE_MS = 30 * 1000;

function slotCacheKey(marketType, groupKey) {
  return `${marketType}:${(groupKey || '').toString().trim().toLowerCase()}`;
}

function buildMarketsUrl(marketType, groupKey) {
  const params = new URLSearchParams({ marketType, fields: 'home' });
  const group = (groupKey || '').toString().trim().toLowerCase();
  if (marketType === 'startline' && group) params.set('starlineGroup', group);
  if (marketType === 'king' && group) params.set('kingBazaarGroup', group);
  return `${API_BASE_URL}/markets/get-markets?${params.toString()}`;
}

async function fetchSlots(marketType, groupKey, marketLabel) {
  const res = await fetch(buildMarketsUrl(marketType, groupKey));
  const data = await res.json();
  const list = Array.isArray(data?.data) ? data.data : [];
  const mapper = marketType === 'king' ? mapKingBazaarSlot : mapStarlineSlot;
  const mapped = list
    .map((m) => mapper(m, marketLabel))
    .sort((a, b) => String(a.startingTime || '').localeCompare(String(b.startingTime || '')));

  if (marketType === 'king' && mapped.length === 0 && groupKey) {
    return buildKingDemoSlots(marketLabel);
  }
  return mapped;
}

export const fetchSpecialSlotsThunk = createAsyncThunk(
  'specialSlots/fetch',
  async ({ marketType, groupKey, marketLabel }, { rejectWithValue }) => {
    try {
      const items = await fetchSlots(marketType, groupKey, marketLabel);
      return { key: slotCacheKey(marketType, groupKey), items };
    } catch (err) {
      return rejectWithValue({
        key: slotCacheKey(marketType, groupKey),
        message: err?.message || 'Failed to load slots',
      });
    }
  },
  {
    condition: ({ marketType, groupKey }, { getState }) => {
      const key = slotCacheKey(marketType, groupKey);
      const bucket = getState().specialSlots.byKey[key];
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
  items: [],
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const specialSlotsSlice = createSlice({
  name: 'specialSlots',
  initialState: {
    byKey: {},
  },
  reducers: {
    clearSpecialSlots(state) {
      state.byKey = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchSpecialSlotsThunk.pending, (state, action) => {
        const key = slotCacheKey(action.meta.arg.marketType, action.meta.arg.groupKey);
        if (!state.byKey[key]) state.byKey[key] = emptyBucket();
        state.byKey[key].status = 'loading';
        state.byKey[key].error = null;
      })
      .addCase(fetchSpecialSlotsThunk.fulfilled, (state, action) => {
        const { key, items } = action.payload;
        if (!state.byKey[key]) state.byKey[key] = emptyBucket();
        state.byKey[key].items = items;
        state.byKey[key].status = 'succeeded';
        state.byKey[key].lastFetchedAt = Date.now();
      })
      .addCase(fetchSpecialSlotsThunk.rejected, (state, action) => {
        const key = action.payload?.key || slotCacheKey(action.meta.arg.marketType, action.meta.arg.groupKey);
        if (!state.byKey[key]) state.byKey[key] = emptyBucket();
        state.byKey[key].status = 'failed';
        state.byKey[key].error = action.payload?.message || 'Failed to load slots';
      });
  },
});

export const { clearSpecialSlots } = specialSlotsSlice.actions;

export const selectSpecialSlots = (marketType, groupKey) => (state) => {
  const key = slotCacheKey(marketType, groupKey);
  return state.specialSlots.byKey[key]?.items || [];
};

export const selectSpecialSlotsStatus = (marketType, groupKey) => (state) => {
  const key = slotCacheKey(marketType, groupKey);
  const bucket = state.specialSlots.byKey[key] || emptyBucket();
  return {
    loading: bucket.status === 'loading' || bucket.status === 'idle',
    error: bucket.error,
  };
};

export default specialSlotsSlice.reducer;
