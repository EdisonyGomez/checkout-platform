import { configureStore } from '@reduxjs/toolkit';
import productsReducer from '../features/products/productsSlice';
import checkoutReducer from '../features/checkout/checkoutSlice';

export const store = configureStore({
  reducer: {
    products: productsReducer,
    checkout: checkoutReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
