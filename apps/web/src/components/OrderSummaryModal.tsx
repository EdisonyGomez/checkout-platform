import type { ProductDto } from '../features/products/productsApi';
import type { Draft } from '../features/checkout/checkoutSlice';
import { formatNumberCOP } from '../lib/money';
import { brandFromNumber, maskCard } from '../lib/card';

export default function OrderSummaryModal({
  open,
  product,
  draft,
  feeBaseCents,
  feeDeliveryCents,
  onBack,
  onClose,
  onConfirmPay,
  totalCents,
}: {
  open: boolean;
  product: ProductDto | null;
  draft: Draft;
  feeBaseCents: number;
  feeDeliveryCents: number;
  totalCents: number;
  onBack: () => void;
  onClose: () => void;
  onConfirmPay: () => void;
}) {
  if (!open) return null;

  const brand = brandFromNumber(draft.card_number);
  const image = product?.image_url?.trim()
    ? product.image_url
    : product
      ? `https://picsum.photos/seed/${encodeURIComponent(product.sku)}/160/160`
      : '';

  const subtotal = product?.price_cents ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] max-w-130 rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <button className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center" onClick={onBack}>
            ‹
          </button>
          <div className="text-base font-extrabold text-slate-900">Order Summary</div>
          <button className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-5 bg-slate-50 space-y-4 max-h-[72vh] overflow-auto">
          {product && (
            <div className="flex items-center gap-3">
              <img src={image} className="h-12 w-12 rounded-lg object-cover bg-slate-100" />
              <div className="text-sm text-slate-600">{product.description ?? ''}</div>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-sm border border-slate-400" />
              Payment Method
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center gap-3">
              <div className="h-8 w-12 rounded-lg bg-slate-900 text-white flex items-center justify-center text-xs font-extrabold">
                {brand === 'Visa' ? 'VISA' : brand === 'Mastercard' ? 'MC' : 'CARD'}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-900">{brand}</div>
                <div className="text-xs text-slate-500">{maskCard(draft.card_number)}</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border border-slate-400" />
              Delivery Address
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
              <div className="font-semibold">{draft.city || '—'}</div>
              <div className="text-slate-500">{draft.address_line || '—'}</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 space-y-2 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span>$ {formatNumberCOP(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Processing Fee</span>
              <span>$ {formatNumberCOP(feeBaseCents)}</span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Delivery Fee</span>
              <span>$ {formatNumberCOP(feeDeliveryCents)}</span>
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-base font-bold text-slate-900">Total</div>
              <div className="text-base font-extrabold text-green-700">$ {formatNumberCOP(totalCents)}</div>
            </div>
          </div>

          <button
            onClick={onConfirmPay}
            className="h-11 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            🔒 Confirm & Pay $ {formatNumberCOP(totalCents)}
          </button>

          <div className="text-[11px] text-slate-500 text-center">
            Your payment is secured with 256-bit encryption
          </div>
        </div>
      </div>
    </div>
  );
}
