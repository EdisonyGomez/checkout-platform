import type { ProductDto } from '../features/products/productsApi';
import { formatNumberCOP } from '../lib/money';
 import { PRODUCT_IMAGE_BY_SKU } from '../lib/productImages'; 

export default function ProductCard({
  product,
  onPay,
}: {
  product: ProductDto;
  onPay: () => void;
}) {
  const disabled = product.available_units <= 0;

  const image = product.image_url?.trim() ||
    PRODUCT_IMAGE_BY_SKU[product.sku];

  return (
    <div className="group rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm transition
                    hover:shadow-md hover:-translate-y-px">
      <div className="aspect-16/10 bg-slate-100 overflow-hidden">
        <img
          src={image}
          alt={product.name}
          className="block h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          loading="lazy"
        />
      </div>

      <div className="p-5">
        <div className="font-extrabold text-slate-900">{product.name}</div>
        <div className="mt-1 text-sm text-slate-500 min-h-10 overflow-hidden text-ellipsis">
          {product.description ?? ''}
        </div>

        <div className="mt-4 flex items-end justify-between">
          <div className="text-lg font-extrabold text-slate-900">$ {formatNumberCOP(product.price_cents)}</div>
          <div className="text-xs text-slate-500">{product.available_units} in stock</div>
        </div>

        <button
          onClick={onPay}
          disabled={disabled}
          className={`mt-4 h-11 w-full rounded-xl font-semibold text-sm flex items-center justify-center gap-2
            transition active:scale-[0.99]
            ${disabled
              ? 'bg-green-200 text-white cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'}
          `}
        >
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
           <path d="M3 7.5C3 6.12 4.12 5 5.5 5h13C19.88 5 21 6.12 21 7.5v9c0 1.38-1.12 2.5-2.5 2.5h-13C4.12 19 3 17.88 3 16.5v-9Z" stroke="currentColor" strokeWidth="1.8"/>
           <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8"/>
           <path d="M7 15h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
         </svg>          Pay with credit card
        </button>
      </div>
    </div>
  );
}
