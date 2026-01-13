import { formatNumberCOP } from '../lib/money';

export default function PaymentResultModal({
  open,
  status,
  productName,
  amountTotalCents,
  reference,
  providerTxId,
  onBack,
}: {
  open: boolean;
  status: 'APPROVED' | 'DECLINED' | 'ERROR';
  productName: string;
  amountTotalCents: number;
  reference: string;
  providerTxId: string;
  onBack: () => void;
}) {
  if (!open) return null;

  const title =
    status === 'APPROVED' ? 'Payment Approved' : status === 'DECLINED' ? 'Payment Declined' : 'Payment Error';

  const subtitle =
    status === 'APPROVED'
      ? 'Your payment was processed successfully.'
      : status === 'DECLINED'
        ? 'Your payment could not be processed. Please try a different payment method.'
        : 'There was an error processing your payment. Please try again.';

  const color =
    status === 'APPROVED'
      ? 'text-emerald-700'
      : status === 'DECLINED'
        ? 'text-red-600'
        : 'text-red-600';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]" />
      <div className="relative w-[92vw] max-w-130 rounded-2xl bg-white shadow-2xl border border-slate-200 p-8">
        {/* <div className="flex justify-center">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <div className="h-10 w-10 rounded-full border-2 border-red-600 flex items-center justify-center text-red-600 font-extrabold">
              ✕
            </div>
          </div>
        </div> */}

        <div className="mt-4 text-center">
          <div className={`text-2xl font-extrabold ${color}`}>{title}</div>
          <div className="mt-2 text-sm text-slate-500">{subtitle}</div>
        </div>

        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm">
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Product</span>
            <span className="font-semibold text-slate-900">{productName}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Amount</span>
            <span className="font-semibold text-slate-900">$ {formatNumberCOP(amountTotalCents)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Reference</span>
            <span className="font-semibold text-slate-900">{reference}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-semibold text-slate-900">{providerTxId}</span>
          </div>
        </div>

        <button
          onClick={onBack}
          className="mt-6 h-11 w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold text-sm"
        >
          ← Back to Products
        </button>
      </div>
    </div>
  );
}
