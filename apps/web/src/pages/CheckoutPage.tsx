import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { payThunk, pollStatusThunk, resetCheckout, setStep } from '../features/checkout/checkoutSlice';

export default function CheckoutPage() {
  const dispatch = useAppDispatch();
  const checkout = useAppSelector((s) => s.checkout);

  const publicNumber = checkout.init?.public_number;
  const transactionId = checkout.init?.transaction_id;

  // Datos de tarjeta (fake)
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardExpMonth, setCardExpMonth] = useState('12'); // debe ser string de 2 chars
  const [cardExpYear, setCardExpYear] = useState('28');   // debe ser string de 2 chars
  const [cardHolder, setCardHolder] = useState('YESID GOMEZ');
  const [installments, setInstallments] = useState(1);

  // Estado inicial del init (lo devuelve tu backend)
  const initStatus = checkout.init?.status;

  // Recovery: si recargó y hay init pero el step quedó en PRODUCT, lo devolvemos a INITED
  useEffect(() => {
    if (checkout.init && checkout.step === 'PRODUCT') {
      dispatch(setStep('INITED'));
    }
  }, [dispatch, checkout.init, checkout.step]);

  // Polling: solo si estamos en POLLING, consultamos cada 2 segundos
  const [pollSeconds, setPollSeconds] = useState(0);

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
    return 'SIN_STATUS';
  }, [checkout.status]);

  const canPay = Boolean(transactionId) && initStatus === 'PENDING' && checkout.step !== 'POLLING' && checkout.step !== 'DONE';

  async function onPay() {
    if (!transactionId) return;

    await dispatch(
      payThunk({
        transaction_id: transactionId,
        card_number: cardNumber,
        card_cvc: cardCvc,
        card_exp_month: cardExpMonth,
        card_exp_year: cardExpYear,
        card_holder: cardHolder,
        installments,
      }) as any,
    );
  }

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
          <div>transaction_id: {checkout.init.transaction_id}</div>
          <div>
            total: {checkout.init.amount_total_cents} {checkout.init.currency}
          </div>
          <div>status init: <strong>{checkout.init.status}</strong></div>

          <hr style={{ margin: '16px 0' }} />

          {initStatus !== 'PENDING' && (
            <div style={{ border: '1px solid #f0c', borderRadius: 12, padding: 12 }}>
              <div style={{ fontWeight: 700 }}>La transacción no está en PENDING</div>
              <div style={{ marginTop: 6 }}>
                Si el init devolvió <strong>{initStatus}</strong>, no se puede continuar con el pago desde esta pantalla.
              </div>
              <div style={{ marginTop: 10 }}>
                Acciones:
                <ul>
                  <li>Reinicia el checkout y vuelve a intentar.</li>
                  <li>Si se queda en ERROR por idempotencia, usa un Idempotency-Key nuevo.</li>
                </ul>
              </div>
              <button onClick={() => dispatch(resetCheckout())} style={{ width: '100%', padding: 12, marginTop: 8 }}>
                Reiniciar checkout
              </button>
            </div>
          )}

          {initStatus === 'PENDING' && (
            <>
              <h3>Pago (tarjeta de prueba)</h3>

              <div style={{ display: 'grid', gap: 8 }}>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  placeholder="card_number (13-19 dígitos)"
                  style={{ padding: 8 }}
                />
                <input
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="card_cvc (3-4 dígitos)"
                  style={{ padding: 8 }}
                />
                <input
                  value={cardExpMonth}
                  onChange={(e) => setCardExpMonth(e.target.value)}
                  placeholder="card_exp_month (2 chars, ej: 12)"
                  style={{ padding: 8 }}
                />
                <input
                  value={cardExpYear}
                  onChange={(e) => setCardExpYear(e.target.value)}
                  placeholder="card_exp_year (2 chars, ej: 28)"
                  style={{ padding: 8 }}
                />
                <input
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="card_holder"
                  style={{ padding: 8 }}
                />

                <input
                  type="number"
                  min={1}
                  max={36}
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  placeholder="installments (1..36)"
                  style={{ padding: 8 }}
                />
              </div>

              <button
                onClick={onPay}
                disabled={!canPay || checkout.loading}
                style={{ marginTop: 12, width: '100%', padding: 12 }}
              >
                Pagar
              </button>

              {checkout.error && <p style={{ color: 'crimson', marginTop: 8 }}>{checkout.error}</p>}
            </>
          )}

          <hr style={{ margin: '16px 0' }} />

          <h3>Estado (polling)</h3>
          <div>step: {checkout.step}</div>
          <div>
            status: <strong>{statusText}</strong>
          </div>

          {checkout.step === 'POLLING' && statusText === 'PENDING' && (
            <p>Esperando confirmación... {pollSeconds}s</p>
          )}
          {checkout.step === 'POLLING' && statusText === 'PENDING' && pollSeconds >= 30 && (
            <div style={{ border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
              <p>El pago sigue pendiente. Esto suele pasar si el webhook no llega (localhost).</p>
              <p>Solución recomendada: exponer el backend con ngrok y configurar el webhook en sandbox.</p>
            </div>
          )}


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
