import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Backdrop from '../components/ui/Backdrop';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loadProducts } from '../features/products/productsSlice';
import { initCheckoutThunk, resetCheckout, setStep } from '../features/checkout/checkoutSlice';
import { detectBrand, formatCardNumber } from '../lib/cardBrand';
import { formatCop } from '../lib/money';

function newIdempotencyKey() {
  return crypto.randomUUID();
}

type FormErrors = Partial<Record<
  | 'email'
  | 'card_number'
  | 'card_cvc'
  | 'card_exp_month'
  | 'card_exp_year'
  | 'card_holder'
  | 'address_line'
  | 'city'
  | 'state',
  string
>>;

export default function ProductPage() {
  const dispatch = useAppDispatch();
  const nav = useNavigate();

  const { items, loading, error } = useAppSelector((s) => s.products);
  const checkout = useAppSelector((s) => s.checkout);

  const [selectedId, setSelectedId] = useState<string>('');

  // Modal state (pantalla 2)
  const [modalOpen, setModalOpen] = useState(false);

  // Datos cliente + delivery
  const [fullName, setFullName] = useState('Yesid Gomez');
  const [email, setEmail] = useState('yesid@test.com');
  const [phone, setPhone] = useState('3000000000');

  const [addressLine, setAddressLine] = useState('Calle 123');
  const [city, setCity] = useState('Bogota');
  const [state, setState] = useState('Cundinamarca');
  const [postalCode, setPostalCode] = useState('110111');

  // Tarjeta (fake)
  const [cardNumber, setCardNumber] = useState('4242424242424242');
  const [cardCvc, setCardCvc] = useState('123');
  const [cardExpMonth, setCardExpMonth] = useState('12');
  const [cardExpYear, setCardExpYear] = useState('28');
  const [cardHolder, setCardHolder] = useState('YESID GOMEZ');
  const [installments, setInstallments] = useState(1);

  // Backdrop (pantalla 3)
  const [summaryOpen, setSummaryOpen] = useState(false);

  const [errors, setErrors] = useState<FormErrors>({});

  // Fees (pro): define valores claros. Luego puedes moverlos a backend/config.
  const feeBaseCents = 3000;
  const feeDeliveryCents = 8000;

  useEffect(() => {
    dispatch(loadProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedId && items.length > 0) setSelectedId(items[0].id);
  }, [items, selectedId]);

  const selected = useMemo(() => items.find((p) => p.id === selectedId), [items, selectedId]);

  const brand = useMemo(() => detectBrand(cardNumber), [cardNumber]);

  const amountProductCents = selected?.price_cents ?? 0;
  const totalCents = amountProductCents + feeBaseCents + feeDeliveryCents;

  function validate(): boolean {
    const next: FormErrors = {};

    if (!email.includes('@')) next.email = 'Email inválido';

    const n = cardNumber.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(n)) next.card_number = 'Debe tener 13 a 19 dígitos';
    if (!/^\d{3,4}$/.test(cardCvc)) next.card_cvc = 'CVC inválido (3-4 dígitos)';
    if (cardExpMonth.trim().length < 2) next.card_exp_month = 'Mes debe tener 2 caracteres (ej: 12)';
    if (cardExpYear.trim().length < 2) next.card_exp_year = 'Año debe tener 2 caracteres (ej: 28)';
    if (!cardHolder.trim()) next.card_holder = 'Titular requerido';

    if (!addressLine.trim()) next.address_line = 'Dirección requerida';
    if (!city.trim()) next.city = 'Ciudad requerida';
    if (!state.trim()) next.state = 'Departamento requerido';

    if (!(installments >= 1 && installments <= 36)) {
      // No lo listamos como error en UI por ahora, pero lo dejamos consistente
      // Puedes mostrar error si quieres
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function openPayModal() {
    // Resetea checkout anterior para no mezclar sesiones
    dispatch(resetCheckout());
    setModalOpen(true);
  }

  async function onContinueToSummary() {
    if (!validate()) return;

    setModalOpen(false);
    setSummaryOpen(true);
  }

  async function onPay() {
    if (!selected) return;

    // Paso 5.1: crear transacción PENDING en backend
    const idempotencyKey = newIdempotencyKey();

    const initResult = await dispatch(
      initCheckoutThunk({
        idempotencyKey,
        input: {
          product_id: selected.id,
          customer: { full_name: fullName, email, phone },
          delivery: { address_line: addressLine, city, state, postal_code: postalCode },
        },
      }),
    ).unwrap();

    // Si init no queda PENDING, no seguimos
    if (initResult.status !== 'PENDING') {
      setSummaryOpen(false);
      return;
    }

    // Guardamos step y mandamos a /checkout (pantalla 4)
    dispatch(setStep('INITED'));
    setSummaryOpen(false);
    nav('/checkout', { replace: true });
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-md px-4 py-3">
          <div className="text-sm font-semibold text-slate-900">Checkout Platform</div>
          <div className="text-xs text-slate-500">Productos disponibles</div>
        </div>
      </header>

      <main className="mx-auto max-w-md px-4 py-4 space-y-3">
        {loading && <Card><div className="text-sm text-slate-600">Cargando productos...</div></Card>}
        {error && <Card><div className="text-sm text-red-600">{error}</div></Card>}

        {/* Selector simple */}
        <Card>
          <div className="text-xs font-semibold text-slate-600">Selecciona un producto</div>
          <select
            className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-slate-400"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {items.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.available_units} disponibles)
              </option>
            ))}
          </select>
        </Card>

        {selected && (
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-base font-bold text-slate-900">{selected.name}</div>
                <div className="mt-1 text-sm text-slate-600">{selected.description ?? ''}</div>
                <div className="mt-3 text-sm text-slate-700">
                  <span className="font-semibold">{formatCop(selected.price_cents, selected.currency)}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">SKU: {selected.sku}</div>
              </div>

              <div className="text-right">
                <div className="text-xs text-slate-500">Unidades</div>
                <div className="text-lg font-extrabold text-slate-900">{selected?.available_units ?? 0}</div>
                {(selected?.available_units ?? 0) <= 0 && (
                  <div className="mt-1 text-xs text-red-600">Sin stock</div>
                )}
              </div>
            </div>

            <div className="mt-4">
              <Button
                onClick={openPayModal}
                disabled={(selected?.available_units ?? 0) <= 0}
                className="w-full"
              >
                Pay with credit card
              </Button>
              <div className="mt-2 text-xs text-slate-500">
                Se abrirá un formulario con datos de tarjeta y entrega (tarjeta fake).
              </div>
            </div>
          </Card>
        )}
      </main>

      {/* Pantalla 2: Modal con tarjeta + delivery */}
      <Modal open={modalOpen} title="Payment & Delivery info" onClose={() => setModalOpen(false)}>
        <div className="space-y-4">
          <Card>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-slate-900">Tarjeta</div>
              <div className="text-xs font-semibold text-slate-600">
                {brand === 'VISA' ? 'VISA' : brand === 'MASTERCARD' ? 'MASTERCARD' : '—'}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3">
              <Input
                label="Número"
                value={formatCardNumber(cardNumber)}
                onChange={(e) => setCardNumber(e.target.value)}
                error={errors.card_number}
                inputMode="numeric"
              />
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="CVC"
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value.replace(/\D+/g, '').slice(0, 4))}
                  error={errors.card_cvc}
                  inputMode="numeric"
                />
                <Input
                  label="Cuotas"
                  value={String(installments)}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  hint="1 a 36"
                  inputMode="numeric"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Mes (MM)"
                  value={cardExpMonth}
                  onChange={(e) => setCardExpMonth(e.target.value.replace(/\D+/g, '').slice(0, 2))}
                  error={errors.card_exp_month}
                  inputMode="numeric"
                />
                <Input
                  label="Año (YY)"
                  value={cardExpYear}
                  onChange={(e) => setCardExpYear(e.target.value.replace(/\D+/g, '').slice(0, 2))}
                  error={errors.card_exp_year}
                  inputMode="numeric"
                />
              </div>
              <Input
                label="Titular"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                error={errors.card_holder}
              />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-slate-900">Cliente</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Input label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} error={errors.email} />
              <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </Card>

          <Card>
            <div className="text-sm font-bold text-slate-900">Entrega</div>
            <div className="mt-3 grid grid-cols-1 gap-3">
              <Input label="Dirección" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} error={errors.address_line} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} error={errors.city} />
                <Input label="Departamento" value={state} onChange={(e) => setState(e.target.value)} error={errors.state} />
              </div>
              <Input label="Código postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)} className="w-1/2">
              Cancelar
            </Button>
            <Button onClick={onContinueToSummary} className="w-1/2">
              Continuar
            </Button>
          </div>
        </div>
      </Modal>

      {/* Pantalla 3: Summary en Backdrop */}
      <Backdrop
        open={summaryOpen}
        header={
          <div>
            <div className="text-sm font-bold text-slate-900">Resumen de pago</div>
            <div className="text-xs text-slate-500">Confirma antes de pagar</div>
          </div>
        }
      >
        <div className="space-y-3">
          <Card>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-slate-900">{selected?.name ?? 'Producto'}</div>
                <div className="text-xs text-slate-500">{selected?.sku ?? ''}</div>
              </div>
              <div className="text-sm font-semibold text-slate-900">
                {selected ? formatCop(selected.price_cents, selected.currency) : formatCop(0, 'COP')}
              </div>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Producto</span>
                <span className="font-semibold text-slate-900">{formatCop(amountProductCents, selected?.currency ?? 'COP')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Base fee</span>
                <span className="font-semibold text-slate-900">{formatCop(feeBaseCents, selected?.currency ?? 'COP')}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Delivery fee</span>
                <span className="font-semibold text-slate-900">{formatCop(feeDeliveryCents, selected?.currency ?? 'COP')}</span>
              </div>

              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-3">
                <span className="text-slate-900 font-bold">Total</span>
                <span className="text-slate-900 font-extrabold">{formatCop(totalCents, selected?.currency ?? 'COP')}</span>
              </div>
            </div>
          </Card>

          {checkout.error && <div className="text-sm text-red-600">{checkout.error}</div>}

          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setSummaryOpen(false)} className="w-1/2">
              Volver
            </Button>
            <Button onClick={onPay} disabled={!selected || checkout.loading} className="w-1/2">
              Pagar
            </Button>
          </div>

          <div className="text-xs text-slate-500">
            Al pagar se crea una transacción PENDING en el backend y luego se procesa el pago con el proveedor.
          </div>
        </div>
      </Backdrop>
    </div>
  );
}

