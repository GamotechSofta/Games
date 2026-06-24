import { store } from './index';
import { fetchMainMarketsThunk } from './slices/marketsSlice';
import { fetchPaymentConfigThunk } from './slices/paymentConfigSlice';
import { fetchMarketGroupsThunk } from './slices/marketGroupsSlice';
import { fetchMyBetsDataThunk } from './slices/myBetsSlice';
import { fetchWalletBalanceThunk } from './slices/walletSlice';

export function prefetchMainMarketsStore(popularOnly = false) {
  return store.dispatch(fetchMainMarketsThunk({ popularOnly, force: false }));
}

export function prefetchPaymentConfigStore() {
  return store.dispatch(fetchPaymentConfigThunk());
}

export function prefetchMyBetsDataStore() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.id && !user?._id) return Promise.resolve();
  return store.dispatch(fetchMyBetsDataThunk());
}

/** @deprecated use prefetchMyBetsDataStore */
export const prefetchMyBetsBootstrapStore = prefetchMyBetsDataStore;

export function prefetchMarketGroupsStore(type) {
  return store.dispatch(fetchMarketGroupsThunk(type));
}

export function prefetchSpecialMarketGroupsStore() {
  void prefetchMarketGroupsStore('starline');
  void prefetchMarketGroupsStore('king');
}

export function prefetchWalletBalanceStore() {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (!user?.id && !user?._id) return Promise.resolve();
  return store.dispatch(fetchWalletBalanceThunk());
}
