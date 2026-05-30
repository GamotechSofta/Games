import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  PAYMENT_CONFIG_DEFAULTS,
  fetchPaymentConfig,
} from '../../api/paymentConfig';

const STALE_MS = 5 * 60 * 1000;

export const fetchPaymentConfigThunk = createAsyncThunk(
  'paymentConfig/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchPaymentConfig();
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to load payment config');
    }
  },
  {
    condition: (_, { getState }) => {
      const { status, lastFetchedAt } = getState().paymentConfig;
      if (status === 'loading') return false;
      if (status === 'succeeded' && lastFetchedAt && Date.now() - lastFetchedAt < STALE_MS) {
        return false;
      }
      return true;
    },
  },
);

const paymentConfigSlice = createSlice({
  name: 'paymentConfig',
  initialState: {
    config: PAYMENT_CONFIG_DEFAULTS,
    status: 'idle',
    error: null,
    lastFetchedAt: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPaymentConfigThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(fetchPaymentConfigThunk.fulfilled, (state, action) => {
        state.config = action.payload;
        state.status = 'succeeded';
        state.lastFetchedAt = Date.now();
      })
      .addCase(fetchPaymentConfigThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to load payment config';
      });
  },
});

export const selectPaymentConfig = (state) => state.paymentConfig.config;

export const selectPaymentConfigStatus = (state) => ({
  loading: state.paymentConfig.status === 'loading' || state.paymentConfig.status === 'idle',
  error: state.paymentConfig.error,
  isFetching: state.paymentConfig.status === 'loading',
});

export default paymentConfigSlice.reducer;
