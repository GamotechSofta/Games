import { configureStore } from '@reduxjs/toolkit';
import marketsReducer from './slices/marketsSlice';
import paymentConfigReducer from './slices/paymentConfigSlice';
import marketGroupsReducer from './slices/marketGroupsSlice';
import specialSlotsReducer from './slices/specialSlotsSlice';
import walletReducer from './slices/walletSlice';
import myBetsReducer from './slices/myBetsSlice';

export const store = configureStore({
  reducer: {
    markets: marketsReducer,
    paymentConfig: paymentConfigReducer,
    marketGroups: marketGroupsReducer,
    specialSlots: specialSlotsReducer,
    wallet: walletReducer,
    myBets: myBetsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
