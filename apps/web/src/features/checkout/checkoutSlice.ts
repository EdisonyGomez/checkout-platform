import { type PayloadAction, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  checkoutInit,
  checkoutPay,
  fetchStatus,
  syncStatus,
  type InitCheckoutInput,
  type InitCheckoutResponse,
  type StatusResponse,
  type PayInput,
} from './checkoutApi';

type UiState = {
  paymentModalOpen: boolean;
  summaryModalOpen: boolean;
  resultModalOpen: boolean;
};

export type Draft = {
  // Card
  card_number: string;
  card_holder: string;
  card_exp_month: string;
  card_exp_year: string;
  card_cvc: string;
  installments: number;

  // Delivery
  address_line: string;
  city: string;
  state: string;
  postal_code: string;

  // Customer
  full_name: string;
  email: string;
  phone: string;
};

type CheckoutStep = 'IDLE' | 'INITED' | 'PAYING' | 'POLLING' | 'DONE';

type CheckoutState = {
  step: CheckoutStep;
  loading: boolean;
  error?: string;

  ui: UiState;
  draft: Draft;

  init?: InitCheckoutResponse;
  status?: StatusResponse;
};

const STORAGE_KEY = 'checkout_store_v1';

function loadState(): CheckoutState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CheckoutState;
  } catch {
    return null;
  }
}

function persist(state: CheckoutState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

const initialState: CheckoutState =
  loadState() ??
  ({
    step: 'IDLE',
    loading: false,
    ui: { paymentModalOpen: false, summaryModalOpen: false, resultModalOpen: false },
    draft: {
      card_number: '4242424242424242',
      card_holder: 'YESID GOMEZ',
      card_exp_month: '12',
      card_exp_year: '28',
      card_cvc: '123',
      installments: 1,

      address_line: '',
      city: '',
      state: '',
      postal_code: '',

      full_name: '',
      email: '',
      phone: '',
    },
  } as CheckoutState);

export const initThunk = createAsyncThunk(
  'checkout/init',
  async (args: { input: InitCheckoutInput; idempotencyKey: string }) => {
    return checkoutInit(args.input, args.idempotencyKey);
  },
);

export const payThunk = createAsyncThunk('checkout/pay', async (input: PayInput) => {
  return checkoutPay(input);
});

export const pollStatusThunk = createAsyncThunk('checkout/status', async (publicNumber: string) => {
  return fetchStatus(publicNumber);
});

export const syncThunk = createAsyncThunk('checkout/sync', async (publicNumber: string) => {
  return syncStatus(publicNumber);
});

const checkoutSlice = createSlice({
  name: 'checkout',
  initialState,
  reducers: {
    setUi(state, action: PayloadAction<Partial<UiState>>) {
      state.ui = { ...state.ui, ...action.payload };
      persist(state);
    },
    setDraft(state, action: PayloadAction<Partial<Draft>>) {
      state.draft = { ...state.draft, ...action.payload };
      persist(state);
    },
    resetAll(state) {
      state.step = 'IDLE';
      state.loading = false;
      state.error = undefined;
      state.init = undefined;
      state.status = undefined;
      state.ui = { paymentModalOpen: false, summaryModalOpen: false, resultModalOpen: false };
      persist(state);
    },
  },
  extraReducers(builder) {
    builder
      .addCase(initThunk.pending, (state) => {
        state.loading = true;
        state.error = undefined;
        state.step = 'IDLE';
        persist(state);
      })
      .addCase(initThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.init = action.payload;
        state.step = 'INITED';
        persist(state);
      })
      .addCase(initThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error init';
        persist(state);
      })
      .addCase(payThunk.pending, (state) => {
        state.loading = true;
        state.error = undefined;
        state.step = 'PAYING';
        persist(state);
      })
      .addCase(payThunk.fulfilled, (state) => {
        state.loading = false;
        state.step = 'POLLING';
        persist(state);
      })
      .addCase(payThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message ?? 'Error pay';
        persist(state);
      })
      .addCase(pollStatusThunk.fulfilled, (state, action) => {
        state.status = action.payload;
        if (action.payload.found && action.payload.status !== 'PENDING') {
          state.step = 'DONE';
          state.ui.resultModalOpen = true;
        }
        persist(state);
      })
      .addCase(syncThunk.fulfilled, (state) => {
        // luego de sync, hacemos polling manualmente desde UI
        persist(state);
      });
  },
});

export const { setUi, setDraft, resetAll } = checkoutSlice.actions;
export default checkoutSlice.reducer;
