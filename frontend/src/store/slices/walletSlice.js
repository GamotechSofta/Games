import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getBalance } from '../../api/bets';

function readStoredBalance() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const b = user?.balance ?? user?.walletBalance ?? user?.wallet ?? 0;
    return Number(b) || 0;
  } catch {
    return 0;
  }
}

export const fetchWalletBalanceThunk = createAsyncThunk(
  'wallet/fetchBalance',
  async (_, { rejectWithValue }) => {
    try {
      const res = await getBalance();
      if (res.success && res.data?.balance != null) {
        return Number(res.data.balance);
      }
      return rejectWithValue(res?.message || 'Failed to fetch balance');
    } catch (err) {
      return rejectWithValue(err?.message || 'Failed to fetch balance');
    }
  },
);

const walletSlice = createSlice({
  name: 'wallet',
  initialState: {
    balance: readStoredBalance(),
    status: 'idle',
    error: null,
  },
  reducers: {
    setBalance(state, action) {
      state.balance = Number(action.payload) || 0;
    },
    syncFromStorage(state) {
      state.balance = readStoredBalance();
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWalletBalanceThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchWalletBalanceThunk.fulfilled, (state, action) => {
        state.balance = action.payload;
        state.status = 'succeeded';
      })
      .addCase(fetchWalletBalanceThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error = action.payload || 'Failed to fetch balance';
      });
  },
});

export const { setBalance, syncFromStorage } = walletSlice.actions;

export const selectWalletBalance = (state) => state.wallet.balance;

export const selectFormattedWalletBalance = (state) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(state.wallet.balance ?? 0);

export default walletSlice.reducer;
