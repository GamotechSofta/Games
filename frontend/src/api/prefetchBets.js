import { prefetchMyBetsDataStore } from '../store/prefetch';

export function prefetchMyBetsData() {
  return prefetchMyBetsDataStore();
}

export const prefetchMyBetHistory = prefetchMyBetsData;
