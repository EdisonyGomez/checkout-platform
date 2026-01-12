import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { payThunk, pollStatusThunk, resetCheckout, setStep } from '../features/checkout/checkoutSlice';

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector((s) => s.checkout);

  const publicNumber = checkout.init?.public_number;

  const [number, setNumber] = useState('4242424242424242');
  const [cvc, setCvc] = useState('123');
  const [expMonth, setExpMonth] = useState('12');
  const [expYear, setExpYear] = useState('28');
  const [holder, setHolder] = useState('YESID GOMEZ');

  useEffect(() => {
    // Si ya hay init y aún no hemos obtenido status, arrancamos polling si aplica
    if (!publicNumber) return;

    if (checkout.step === 'POLLING') {
      const interval = setInterval(() => {
        dispatch(pollStatusThunk(publicNumber));
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [dispatch, publicNumber, checkout.step]);

  useEffect(() => {
    // Recovery: si refrescó y venía con init pero sin step adecuado, mantenerlo en INITED
    if (publicNumber && checkout.step === 'PRODUCT') {
      dispatch(setStep('INITED'));
    }
  }, [dispatch, publicNumber, checkout.step]);

  async function onPay() {
    if (!publicNumber) return;
    await dispatch(
      payThunk({
        public_number: publicNumber,
        card: { number, cvc, exp_month: expMonth, exp_year: expYear, holder },
      }) as any,
    );
  }

  const statusText =
    checkout.status?.found === true
      ? checkout.status.status
      : checkout.status?.found === false
        ? 'NOT_FOUND'
        : 'SIN_STATUS';

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2>Checkout</h2>

      {!checkout.init && (
        <p>
          No hay checkout iniciado. Vuelve a <a href="/">/</a>
        </p>
      )}

      {checkout.init && (
        <>
          <div>
            public_number: <strong>{checkout.init.public_number}</strong>
          </div>
          <div>
            total: {checkout.init.amount_total_cents} {checkout.init.currency}
          </div>

          <hr style={{ margin: '16px 0' }} />

          <h3>Pago (tarjeta de prueba)</h3>
          <div style={{ display: 'grid', gap: 8 }}>
            <input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Número" style={{ padding: 8 }} />
            <input value={cvc} onChange={(e) => setCvc(e.target.value)} placeholder="CVC" style={{ padding: 8 }} />
            <input value={expMonth} onChange={(e) => setExpMonth(e.target.value)} placeholder="Mes" style={{ padding: 8 }} />
            <input value={expYear} onChange={(e) => setExpYear(e.target.value)} placeholder="Año" style={{ padding: 8 }} />
            <input value={holder} onChange={(e) => setHolder(e.target.value)} placeholder="Titular" style={{ padding: 8 }} />
          </div>

          <button
            onClick={onPay}
            disabled={checkout.loading || checkout.step === 'POLLING' || checkout.step === 'DONE'}
            style={{ marginTop: 12, width: '100%', padding: 12 }}
          >
            Pagar
          </button>

          {checkout.error && <p style={{ color: 'crimson', marginTop: 8 }}>{checkout.error}</p>}

          <hr style={{ margin: '16px 0' }} />

          <h3>Estado</h3>
          <p>step: {checkout.step}</p>
          <p>status: <strong>{statusText}</strong></p>

          {checkout.status?.found === true && (
            <>
              <div>wompi_transaction_id: {checkout.status.wompi_transaction_id ?? '-'}</div>
              <div>updated_at: {checkout.status.updated_at}</div>
            </>
          )}

          <button onClick={() => dispatch(resetCheckout())} style={{ marginTop: 12, width: '100%', padding: 12 }}>
            Reiniciar checkout
          </button>

          <p style={{ marginTop: 12 }}>
            <a href="/">Volver a productos</a>
          </p>
        </>
      )}
    </div>
  );
}
