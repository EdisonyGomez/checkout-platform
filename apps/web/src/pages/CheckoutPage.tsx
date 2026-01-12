import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { pollStatusThunk, resetCheckout, setStep } from '../features/checkout/checkoutSlice';
import { loadProducts } from '../features/products/productsSlice';

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();
  const checkout = useAppSelector((s) => s.checkout);

  const publicNumber = checkout.init?.public_number;

  const [pollSeconds, setPollSeconds] = useState(0);

  // Recovery step
  useEffect(() => {
    if (checkout.init && checkout.step === 'PRODUCT') {
      dispatch(setStep('POLLING'));
    }
  }, [dispatch, checkout.init, checkout.step]);

  // Polling
  useEffect(() => {
    if (!publicNumber) return;
    if (checkout.step !== 'POLLING') return;

    setPollSeconds(0);

    const interval = setInterval(() => {
      dispatch(pollStatusThunk(publicNumber));
      setPollSeconds((s) => s + 2);
    }, 2000);

    return () => clearInterval(interval);
  }, [dispatch, publicNumber, checkout.step]);

  const statusText = useMemo(() => {
    if (checkout.status?.found === true) return checkout.status.status;
    if (checkout.status?.found === false) return 'NOT_FOUND';
    return 'PENDING';
  }, [checkout.status]);

  const isFinal =
    checkout.status?.found === true &&
    checkout.status.status !== 'PENDING';

  // Cuando finaliza: refrescar productos y redirigir (pantalla 5)
  useEffect(() => {
    if (!isFinal) return;

    dispatch(loadProducts());

    const timeout = setTimeout(() => {
      nav('/', { replace: true });
    }, 1800);

    return () => clearTimeout(timeout);
  }, [dispatch, isFinal, nav]);

  async function onReset() {
    dispatch(resetCheckout());
    nav('/', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Estado del pago</div>
          <div className="text-xs text-slate-500">Seguimiento de transacción</div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-3">
        {!checkout.init && (
          <Card>
            <div className="text-sm text-slate-700">
              No hay checkout iniciado. Vuelve a productos.
            </div>
            <div className="mt-3">
              <Button onClick={() => nav('/')}>Volver</Button>
            </div>
          </Card>
        )}

        {checkout.init && (
          <>
            <Card>
              <div className="text-xs text-slate-500">public_number</div>
              <div className="text-sm font-bold text-slate-900">{checkout.init.public_number}</div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                <div>
                  <div className="text-slate-500">transaction_id</div>
                  <div className="font-semibold break-all">{checkout.init.transaction_id}</div>
                </div>
                <div>
                  <div className="text-slate-500">total</div>
                  <div className="font-semibold">
                    {checkout.init.amount_total_cents} {checkout.init.currency}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">status</div>
                  <div className="text-lg font-extrabold text-slate-900">{statusText}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-500">polling</div>
                  <div className="text-sm font-semibold text-slate-900">{pollSeconds}s</div>
                </div>
              </div>

              {checkout.status?.found === true && (
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="break-all">
                    wompi_transaction_id: <span className="font-semibold">{checkout.status.wompi_transaction_id ?? '-'}</span>
                  </div>
                  <div>
                    updated_at: <span className="font-semibold">{checkout.status.updated_at}</span>
                  </div>
                </div>
              )}

              {statusText === 'PENDING' && pollSeconds >= 20 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  El pago sigue pendiente. En localhost el webhook puede no llegar. Usa la sincronización de estado.
                  <div className="mt-2">
                    <Button
                      variant="secondary"
                      onClick={async () => {
                        // Llama sync via fetch directo para no expandir slice aquí.
                        // Si ya tienes syncThunk, úsalo.
                        const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
                        await fetch(`${base}/api/transactions/${checkout.init!.public_number}/sync`, { method: 'POST' });
                        dispatch(pollStatusThunk(checkout.init!.public_number));
                      }}
                    >
                      Sincronizar estado
                    </Button>
                  </div>
                </div>
              )}

              {isFinal && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Pago finalizado. Redirigiendo a productos...
                </div>
              )}

              <div className="mt-3">
                <Button variant="danger" onClick={onReset}>
                  Reiniciar checkout
                </Button>
              </div>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
