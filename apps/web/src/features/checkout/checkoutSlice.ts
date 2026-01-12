import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { checkoutInit, type InitCheckoutInput, type InitCheckoutResponse } from './checkoutApi';
import { checkoutPay, fetchStatus, type StatusResponse } from './checkoutApi';
import type { PayloadAction } from '@reduxjs/toolkit';

type CheckoutStep = 'PRODUCT' | 'INITED' | 'PAYING' | 'POLLING' | 'DONE';



type CheckoutState = {
    step: CheckoutStep;
    loading: boolean;
    error?: string;
    init?: InitCheckoutResponse;
    idempotencyKey?: string;
    status?: StatusResponse;

};

const STORAGE_KEY = 'checkout_state_v1';

function loadState(): CheckoutState | null {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as CheckoutState;
    } catch {
        return null;
    }
}

function persistState(state: CheckoutState) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
        // ignore
    }
}

const initialState: CheckoutState = loadState() ?? {
    step: 'PRODUCT',
    loading: false,
};

export const initCheckoutThunk = createAsyncThunk(
    'checkout/init',
    async (args: { input: InitCheckoutInput; idempotencyKey: string }) => {
        return checkoutInit(args.input, args.idempotencyKey);
    },
);



const checkoutSlice = createSlice({
    name: 'checkout',
    initialState,
reducers: {
  resetCheckout(state) {
    state.step = 'PRODUCT';
    state.loading = false;
    state.error = undefined;
    state.init = undefined;
    state.idempotencyKey = undefined;
    state.status = undefined;
    persistState(state);
  },

  setStep(state, action: PayloadAction<CheckoutState['step']>) {
    state.step = action.payload;
    persistState(state);
  },
},

    
    extraReducers(builder) {
        builder
            .addCase(initCheckoutThunk.pending, (state, action) => {
                state.loading = true;
                state.error = undefined;
                state.idempotencyKey = action.meta.arg.idempotencyKey;
                persistState(state);
            })
            .addCase(initCheckoutThunk.fulfilled, (state, action) => {
                state.loading = false;
                state.init = action.payload;
                state.step = 'INITED';
                persistState(state);
            })
            .addCase(initCheckoutThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? 'Error init';
                persistState(state);
            })
            .addCase(payThunk.pending, (state) => {
                state.loading = true;
                state.error = undefined;
                state.step = 'PAYING';
                persistState(state);
            })
            .addCase(payThunk.fulfilled, (state) => {
                state.loading = false;
                state.step = 'POLLING';
                persistState(state);
            })
            .addCase(payThunk.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message ?? 'Error pay';
                persistState(state);
            })
            .addCase(pollStatusThunk.fulfilled, (state, action) => {
                state.status = action.payload;
                if (action.payload.found && action.payload.status !== 'PENDING') {
                    state.step = 'DONE';
                }
                persistState(state);
            });

    },
});

export const payThunk = createAsyncThunk(
    'checkout/pay',
    async (args: { public_number: string; card: { number: string; cvc: string; exp_month: string; exp_year: string; holder: string } }) => {
        return checkoutPay(args);
    },
);

export const pollStatusThunk = createAsyncThunk('checkout/status', async (publicNumber: string) => {
    return fetchStatus(publicNumber);
});


export const { resetCheckout, setStep  } = checkoutSlice.actions;
export default checkoutSlice.reducer;

