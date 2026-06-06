import { createAsyncThunk, createSlice, createSelector } from '@reduxjs/toolkit';
import { API_BASE_URL } from '../../config/api';
import fetchNoStore from '../../utils/fetchNoStore';
import {
  buildKingDemoSlots,
  mapKingBazaarSlot,
  mapStarlineSlot,
} from '../../utils/specialMarketSlots';

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
  const res = await fetchNoStore(buildMarketsUrl(marketType, groupKey));
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
    condition: ({ marketType, groupKey, force = false }, { getState }) => {
      if (force) return true;
      const key = slotCacheKey(marketType, groupKey);
      const bucket = getState().specialSlots.byKey[key];
      if (!bucket) return true;
      if (bucket.status === 'loading') return false;
      if (bucket.status === 'succeeded' && bucket.items.length > 0) return false;
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

const EMPTY_ITEMS = [];
const DEFAULT_BUCKET = Object.freeze({
  items: EMPTY_ITEMS,
  status: 'idle',
  error: null,
  lastFetchedAt: null,
});

const slotsSelectorCache = new Map();
const statusSelectorCache = new Map();

function getSlotsSelector(marketType, groupKey) {
  const key = slotCacheKey(marketType, groupKey);
  if (!slotsSelectorCache.has(key)) {
    slotsSelectorCache.set(
      key,
      createSelector(
        (state) => state.specialSlots.byKey[key]?.items,
        (items) => items ?? EMPTY_ITEMS,
      ),
    );
  }
  return slotsSelectorCache.get(key);
}

function getStatusSelector(marketType, groupKey) {
  const key = slotCacheKey(marketType, groupKey);
  if (!statusSelectorCache.has(key)) {
    statusSelectorCache.set(
      key,
      createSelector(
        (state) => state.specialSlots.byKey[key],
        (bucket) => {
          const b = bucket || DEFAULT_BUCKET;
          return {
            loading: b.status === 'loading' || b.status === 'idle',
            error: b.error,
          };
        },
      ),
    );
  }
  return statusSelectorCache.get(key);
}

export const selectSpecialSlots = (marketType, groupKey) => getSlotsSelector(marketType, groupKey);

export const selectSpecialSlotsStatus = (marketType, groupKey) => getStatusSelector(marketType, groupKey);

export default specialSlotsSlice.reducer;
