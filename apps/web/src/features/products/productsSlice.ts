import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchProducts, type ProductDto } from './productsApi';

type ProductsState = {
  items: ProductDto[];
  loading: boolean;
  error?: string;
};

const initialState: ProductsState = {
  items: [],
  loading: false,
};

export const loadProducts = createAsyncThunk('products/load', async () => {
  return fetchProducts();
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {},
  extraReducers(builder) {
    builder
      .addCase(loadProducts.pending, (state) => {
        state.loading = true;
        state.error = undefined;
      })
      .addCase(loadProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(loadProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error';
      });
  },
});

export default productsSlice.reducer;
