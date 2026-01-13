import type { ProductDto } from '../features/products/productsApi';
import { formatNumberCOP } from '../lib/money';
import { brandFromNumber, formatCardInput } from '../lib/card';
import type { Draft } from '../features/checkout/checkoutSlice';
 import { PRODUCT_IMAGE_BY_SKU } from '../lib/productImages'; 

export default function PaymentDetailsModal({
  open,
  product,
  draft,
  onChange,
  onClose,
  onContinue,
}: {
  open: boolean;
  product: ProductDto | null;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onClose: () => void;
  onContinue: () => void;
}) {
  if (!open) return null;

const image = product
   ? (product.image_url?.trim() ||
      PRODUCT_IMAGE_BY_SKU[product.sku])
   : '';

  const brand = brandFromNumber(draft.card_number);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-[92vw] max-w-130 rounded-2xl bg-white shadow-2xl border border-slate-200">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="text-lg font-extrabold text-slate-900">Payment Details</div>
          <button className="h-9 w-9 rounded-lg hover:bg-slate-100 flex items-center justify-center" onClick={onClose}>
            ✕
          </button>
        </div>

        {product && (
          <div className="px-5 py-4 border-b border-slate-200 flex items-center gap-3">
            <img src={image} className="h-10 w-10 rounded-lg object-cover bg-slate-100" />
            <div className="flex-1">
              <div className="font-bold text-slate-900">{product.name}</div>
              <div className="text-sm text-green-700 font-semibold">$ {formatNumberCOP(product.price_cents)}</div>
            </div>
          </div>
        )}

        <div className="p-5 space-y-5 bg-slate-50 max-h-[70vh] overflow-auto">
          {/* Card info */}
          <div>
            <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-sm border border-slate-400" />
              Card Information
            </div>

            <div className="mt-3 space-y-3">
              <div className="relative text-gray-950">
                <input
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none
                            focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                  placeholder="1234 5678 9012 3456"
                  value={formatCardInput(draft.card_number)}
                  onChange={(e) => onChange({ card_number: e.target.value })}
                  inputMode="numeric"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-lg">
                  {brand}
                </div>
              </div>

              <input
                className=" text-gray-950 h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none
                          focus:border-slate-400 focus:ring-2 focus:ring-slate-200 placeholder:text-slate-400"
                placeholder="Cardholder Name"
                value={draft.card_holder}
                onChange={(e) => onChange({ card_holder: e.target.value })}
              />

              <div className="grid grid-cols-3 gap-3 text-gray-950">
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="MM"
                  value={draft.card_exp_month}
                  onChange={(e) => onChange({ card_exp_month: e.target.value.replace(/\D+/g, '').slice(0, 2) })}
                  inputMode="numeric"
                />
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="YY"
                  value={draft.card_exp_year}
                  onChange={(e) => onChange({ card_exp_year: e.target.value.replace(/\D+/g, '').slice(0, 2) })}
                  inputMode="numeric"
                />
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="CVC"
                  value={draft.card_cvc}
                  onChange={(e) => onChange({ card_cvc: e.target.value.replace(/\D+/g, '').slice(0, 4) })}
                  inputMode="numeric"
                />
              </div>
            </div>
          </div>

          {/* Delivery */}
          <div className="text-gray-950">
            <div className="text-sm font-semibold text-gray-950 flex items-center gap-2">
              <span className="inline-block h-4 w-4 rounded-full border border-slate-400" />
              Delivery Address
            </div>

            <div className="mt-3 space-y-3 text-gray-950">
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                placeholder="Street Address"
                value={draft.address_line}
                onChange={(e) => onChange({ address_line: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="City"
                  value={draft.city}
                  onChange={(e) => onChange({ city: e.target.value })}
                />
                <input
                  className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                  placeholder="State / Department"
                  value={draft.state}
                  onChange={(e) => onChange({ state: e.target.value })}
                />
              </div>
              <input
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-slate-400"
                placeholder="Postal Code"
                value={draft.postal_code}
                onChange={(e) => onChange({ postal_code: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={onContinue}
            className="h-11 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm flex items-center justify-center gap-2"
          >
            Continue to Summary <span className="text-lg">›</span>
          </button>
        </div>
      </div>
    </div>
  );
}
