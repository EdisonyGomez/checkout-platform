import { useEffect, useMemo, useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Backdrop from '../components/ui/Backdrop';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loadProducts } from '../features/products/productsSlice';
import { initCheckoutThunk, payThunk, pollStatusThunk, resetCheckout, setStep } from '../features/checkout/checkoutSlice';
import { formatCop } from '../lib/money';
import { detectBrand, formatCardNumber } from '../lib/cardBrand';

function uuid() {
  return crypto.randomUUID();
}

type Screen = 'PRODUCT' | 'PAYMENT_INFO' | 'SUMMARY' | 'PROCESSING' | 'DONE';

export default function CheckoutFlowPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products);
  const checkout = useAppSelector((s) => s.checkout);

  // UI screens
  const [screen, setScreen] = useState<Screen>('PRODUCT');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);

  // product selected
  const [selectedId, setSelectedId] = useState<string>('');

  // form: customer + delivery
  const [fullName, setFullName] = useState('Yesid Gomez');
  const [email, setEmail] = useState('yesid@test.com');
  const [phone, setPhone] = useState('3000000000');

  const [addressLine, setAddressLine] = useState('Calle 123');
  const [city, setCity] = useState('Bogota');
  const [state, setState] = useState('Cundinamarca');
  const [postalCode, setPostalCode] = useState('110111');

  // form: card (DTO real backend)
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('28');
  const [cardHolder, setCardHolder] = useState('YESID GOMEZ');
  const [installments, setInstallments] = useState(1);

  // polling
  const publicNumber = checkout.init?.public_number;
  const transactionId = checkout.init?.transaction_id;
  const status = checkout.status?.found === true ? checkout.status.status : 'PENDING';
  const [pollSeconds, setPollSeconds] = useState(0);

  useEffect(() => {
    dispatch(loadProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedId && products.items.length > 0) setSelectedId(products.items[0].id);
  }, [products.items, selectedId]);

  const selected = useMemo(() => products.items.find((p) => p.id === selectedId), [products.items, selectedId]);

  const brand = useMemo(() => detectBrand(cardNumber), [cardNumber]);

  // Summary values
  const feeBase = 3000;
  const feeDelivery = 8000;
  const productAmount = selected?.price_cents ?? 0;
  const total = productAmount + feeBase + feeDelivery;

  // Start polling when processing
  useEffect(() => {
    if (!publicNumber) return;
    if (screen !== 'PROCESSING') return;

    setPollSeconds(0);

    const interval = setInterval(() => {
      dispatch(pollStatusThunk(publicNumber));
      setPollSeconds((s) => s + 2);
    }, 2000);

    return () => clearInterval(interval);
  }, [dispatch, publicNumber, screen]);

  // Move to DONE when status final
  useEffect(() => {
    if (screen !== 'PROCESSING') return;
    if (checkout.status?.found !== true) return;
    if (checkout.status.status === 'PENDING') return;

    setScreen('DONE');
  }, [checkout.status, screen]);

  function openPayment() {
    dispatch(resetCheckout());
    setPaymentModalOpen(true);
    setScreen('PAYMENT_INFO');
  }

  function validatePaymentInfo() {
    const n = cardNumber.replace(/\s+/g, '');
    if (!email.includes('@')) return 'Email inválido';
    if (!/^\d{13,19}$/.test(n)) return 'Número de tarjeta inválido (13-19 dígitos)';
    if (!/^\d{3,4}$/.test(cardCvc)) return 'CVC inválido (3-4 dígitos)';
    if (cardExpMonth.length < 2) return 'Mes inválido (MM)';
    if (cardExpYear.length < 2) return 'Año inválido (YY)';
    if (!cardHolder.trim()) return 'Titular requerido';
    if (!addressLine.trim() || !city.trim() || !state.trim()) return 'Completa dirección, ciudad y departamento';
    if (!(installments >= 1 && installments <= 36)) return 'Cuotas inválidas (1..36)';
    return null;
  }

  async function goToSummary() {
    const err = validatePaymentInfo();
    if (err) {
      alert(err);
      return;
    }
    setPaymentModalOpen(false);
    setSummaryOpen(true);
    setScreen('SUMMARY');
  }

  async function confirmAndPay() {
    if (!selected) return;

    // 1) init (PENDING)
    const idempotencyKey = uuid();
    const init = await dispatch(
      initCheckoutThunk({
        idempotencyKey,
        input: {
          product_id: selected.id,
          customer: { full_name: fullName, email, phone },
          delivery: { address_line: addressLine, city, state, postal_code: postalCode },
        },
      }),
    ).unwrap();

    if (init.status !== 'PENDING') {
      alert(`No se pudo iniciar checkout. Status: ${init.status}`);
      return;
    }

    // 2) pay (DTO real)
    await dispatch(
      payThunk({
        transaction_id: init.transaction_id,
        card_number: cardNumber.replace(/\s+/g, ''),
        card_cvc: cardCvc,
        card_exp_month: cardExpMonth,
        card_exp_year: cardExpYear,
        card_holder: cardHolder,
        installments,
      }) as any,
    );

    // 3) Start processing + polling
    dispatch(setStep('POLLING'));
    setSummaryOpen(false);
    setScreen('PROCESSING');
  }

  async function syncNow() {
    if (!publicNumber) return;
    const base = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';
    await fetch(`${base}/api/transactions/${publicNumber}/sync`, { method: 'POST' });
    dispatch(pollStatusThunk(publicNumber));
  }

  function backToCatalog() {
    dispatch(resetCheckout());
    dispatch(loadProducts());
    setScreen('PRODUCT');
  }

  const statusBadge =
    screen === 'DONE'
      ? status === 'APPROVED'
        ? 'Aprobado'
        : status === 'DECLINED'
          ? 'Rechazado'
          : 'Error'
      : 'Pendiente';

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-extrabold text-slate-900">Checkout Platform</div>
            <div className="text-sm text-slate-500">Compra segura (sandbox)</div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-600">
            <span className="rounded-full bg-slate-100 px-3 py-1">1) Producto</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">2) Datos</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">3) Resumen</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">4) Estado</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left: product catalog */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Productos</div>
                  <div className="text-xs text-slate-500">Selecciona un producto y paga con tarjeta</div>
                </div>
                <div className="text-xs text-slate-500">
                  {products.loading ? 'Cargando...' : `${products.items.length} items`}
                </div>
              </div>

              {products.error && <div className="mt-2 text-sm text-red-600">{products.error}</div>}

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.items.map((p) => {
                  const active = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`text-left rounded-2xl border p-4 transition shadow-sm
                        ${active ? 'border-slate-900 bg-white' : 'border-slate-200 bg-white hover:border-slate-300'}
                      `}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">{p.name}</div>
                          <div className="mt-1 text-xs text-slate-500">{p.sku}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Stock</div>
                          <div className={`text-lg font-extrabold ${p.available_units ?? 0 > 0 ? 'text-slate-900' : 'text-red-600'}`}>
                            {p.available_units}
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-sm text-slate-600 line-clamp-2">{p.description ?? ''}</div>

                      <div className="mt-4 flex items-center justify-between">
                        <div className="text-sm font-extrabold text-slate-900">{formatCop(p.price_cents, p.currency)}</div>
                        <div className="text-xs text-slate-500">COP</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {selected && (
              <Card>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{selected.name}</div>
                    <div className="text-xs text-slate-500">{selected.available_units} disponibles</div>
                  </div>
                  <div className="text-sm font-extrabold text-slate-900">{formatCop(selected.price_cents, selected.currency)}</div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row gap-2">
                  <Button onClick={openPayment} disabled={(selected?.available_units ?? 0) <= 0}>
                    Pay with credit card
                  </Button>
                  <Button variant="secondary" onClick={backToCatalog}>
                    Reiniciar
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Right: status panel */}
          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500">Estado</div>
                  <div className="text-lg font-extrabold text-slate-900">{statusBadge}</div>
                </div>
                <div className="text-xs text-slate-500">{screen}</div>
              </div>

              {checkout.init && (
                <div className="mt-3 text-xs text-slate-600 space-y-1">
                  <div className="break-all">
                    public_number: <span className="font-semibold">{checkout.init.public_number}</span>
                  </div>
                  <div className="break-all">
                    transaction_id: <span className="font-semibold">{checkout.init.transaction_id}</span>
                  </div>
                </div>
              )}

              {screen === 'PROCESSING' && (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  Procesando pago... <span className="font-semibold">{pollSeconds}s</span>
                  {status === 'PENDING' && pollSeconds >= 20 && (
                    <div className="mt-2">
                      <div className="text-xs text-slate-500">
                        Si el webhook no llega (localhost), usa Sync.
                      </div>
                      <div className="mt-2">
                        <Button variant="secondary" onClick={syncNow}>
                          Sincronizar estado
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {screen === 'DONE' && (
                <div className="mt-3 space-y-2">
                  <div
                    className={`rounded-xl p-3 text-sm font-semibold
                      ${status === 'APPROVED' ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : ''}
                      ${status === 'DECLINED' ? 'bg-amber-50 text-amber-900 border border-amber-200' : ''}
                      ${status === 'ERROR' ? 'bg-red-50 text-red-900 border border-red-200' : ''}
                    `}
                  >
                    {status === 'APPROVED' && 'Pago aprobado. Tu pedido será procesado.'}
                    {status === 'DECLINED' && 'Pago rechazado. Intenta con otra tarjeta.'}
                    {status === 'ERROR' && 'Error procesando el pago. Intenta nuevamente.'}
                  </div>

                  <Button onClick={backToCatalog}>Volver al catálogo</Button>
                </div>
              )}
            </Card>

            <Card>
              <div className="text-sm font-bold text-slate-900">Soporte</div>
              <div className="mt-2 text-xs text-slate-500">
                En sandbox el webhook puede no llegar a localhost. El botón Sync consulta el proveedor y reconcilia tu BD.
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Modal Payment Info */}
      <Modal
        open={paymentModalOpen}
        title="Pay with credit card"
        onClose={() => {
          setPaymentModalOpen(false);
          setScreen('PRODUCT');
        }}
      >
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Tarjeta</div>
              <div className="text-xs font-semibold text-slate-600">{brand}</div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <Input
                label="Número"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value)}
                hint="13 a 19 dígitos"
                inputMode="numeric"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input label="CVC" value={cardCvc} onChange={(e) => setCardCvc(e.target.value.replace(/\D+/g, '').slice(0, 4))} inputMode="numeric" />
                <Input label="Cuotas" value={String(installments)} onChange={(e) => setInstallments(Number(e.target.value))} inputMode="numeric" hint="1 a 36" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Mes (MM)" value={cardExpMonth} onChange={(e) => setCardExpMonth(e.target.value.replace(/\D+/g, '').slice(0, 2))} inputMode="numeric" />
                <Input label="Año (YY)" value={cardExpYear} onChange={(e) => setCardExpYear(e.target.value.replace(/\D+/g, '').slice(0, 2))} inputMode="numeric" />
              </div>
              <Input label="Titular" value={cardHolder} onChange={(e) => setCardHolder(e.target.value)} />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-slate-900">Entrega</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />

              <Input label="Dirección" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
                <Input label="Departamento" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <Input label="Código postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" full={false} className="w-1/2" onClick={() => setPaymentModalOpen(false)}>
              Cancelar
            </Button>
            <Button full={false} className="w-1/2" onClick={() => { setPaymentModalOpen(false); setSummaryOpen(true); setScreen('SUMMARY'); }}>
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Backdrop Summary */}
      <Backdrop
        open={summaryOpen}
        header={
          <div>
            <div className="text-sm font-bold text-slate-900">Resumen</div>
            <div className="text-xs text-slate-500">Producto, fees y total</div>
          </div>
        }
      >
        <div className="space-y-3">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-slate-900">{selected?.name ?? 'Producto'}</div>
                <div className="text-xs text-slate-500">{selected?.sku ?? ''}</div>
              </div>
              <div className="text-sm font-extrabold text-slate-900">
                {selected ? formatCop(selected.price_cents, selected.currency) : formatCop(0, 'COP')}
              </div>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Producto</span>
                <span className="font-semibold text-slate-900">{formatCop(productAmount, selected?.currency ?? 'COP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Base fee</span>
                <span className="font-semibold text-slate-900">{formatCop(feeBase, selected?.currency ?? 'COP')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Delivery fee</span>
                <span className="font-semibold text-slate-900">{formatCop(feeDelivery, selected?.currency ?? 'COP')}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between">
                <span className="font-bold text-slate-900">Total</span>
                <span className="font-extrabold text-slate-900">{formatCop(total, selected?.currency ?? 'COP')}</span>
              </div>
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" full={false} className="w-1/2" onClick={() => { setSummaryOpen(false); setScreen('PRODUCT'); }}>
              Volver
            </Button>
            <Button full={false} className="w-1/2" onClick={confirmAndPay} disabled={!selected || (selected?.available_units ?? 0) <= 0}>
              Pagar
            </Button>
          </div>

          {transactionId && (
            <div className="text-xs text-slate-500">
              transaction_id: <span className="font-semibold">{transactionId}</span>
            </div>
          )}
        </div>
      </Backdrop>
    </div>
  );
}
