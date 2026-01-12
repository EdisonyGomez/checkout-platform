import { useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { loadProducts } from '../features/products/productsSlice';
import { initCheckoutThunk, resetCheckout } from '../features/checkout/checkoutSlice';

function newIdempotencyKey() {
  return crypto.randomUUID();
}

export default function ProductPage() {
  const dispatch = useAppDispatch();
  const { items, loading, error } = useAppSelector((s) => s.products);
  const checkout = useAppSelector((s) => s.checkout);

  const [selectedProductId, setSelectedProductId] = useState<string>('');

  const [fullName, setFullName] = useState('Yesid Gomez');
  const [email, setEmail] = useState('yesid@test.com');
  const [phone, setPhone] = useState('3000000000');

  const [address, setAddress] = useState('Calle 123');
  const [city, setCity] = useState('Bogota');
  const [state, setState] = useState('Cundinamarca');
  const [postal, setPostal] = useState('110111');

  useEffect(() => {
    dispatch(loadProducts());
  }, [dispatch]);

  useEffect(() => {
    if (!selectedProductId && items.length > 0) setSelectedProductId(items[0].id);
  }, [items, selectedProductId]);

  const selected = useMemo(() => items.find((p) => p.id === selectedProductId), [items, selectedProductId]);

  async function onInitCheckout() {
    if (!selectedProductId) return;

    const idempotencyKey = newIdempotencyKey();

    await dispatch(
      initCheckoutThunk({
        idempotencyKey,
        input: {
          product_id: selectedProductId,
          customer: { full_name: fullName, email, phone },
          delivery: { address_line: address, city, state, postal_code: postal },
        },
      }),
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2>Productos</h2>

      {loading && <p>Cargando...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}

      <select
        value={selectedProductId}
        onChange={(e) => setSelectedProductId(e.target.value)}
        style={{ width: '100%', padding: 8 }}
      >
        {items.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} - {p.price_cents} {p.currency}
          </option>
        ))}
      </select>

      {selected && (
        <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <div style={{ fontWeight: 700 }}>{selected.name}</div>
          <div style={{ opacity: 0.8 }}>{selected.description ?? ''}</div>
          <div style={{ marginTop: 8 }}>
            <strong>{selected.price_cents}</strong> {selected.currency}
          </div>
          {typeof selected.available_units === 'number' && <div style={{ marginTop: 4 }}>Disponibles: {selected.available_units}</div>}
          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>SKU: {selected.sku}</div>
        </div>
      )}

      <hr style={{ margin: '16px 0' }} />

      <h3>Datos para iniciar checkout</h3>

      <div style={{ display: 'grid', gap: 8 }}>
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombre completo" style={{ padding: 8 }} />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" style={{ padding: 8 }} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Teléfono" style={{ padding: 8 }} />

        <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dirección" style={{ padding: 8 }} />
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Ciudad" style={{ padding: 8 }} />
        <input value={state} onChange={(e) => setState(e.target.value)} placeholder="Departamento" style={{ padding: 8 }} />
        <input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="Código postal" style={{ padding: 8 }} />
      </div>

      <button
        onClick={onInitCheckout}
        disabled={checkout.loading || !selectedProductId}
        style={{ marginTop: 12, width: '100%', padding: 12 }}
      >
        Iniciar checkout
      </button>

      {checkout.error && <p style={{ color: 'crimson', marginTop: 8 }}>{checkout.error}</p>}

      {checkout.init && (
        <div style={{ marginTop: 12, border: '1px solid #ddd', borderRadius: 12, padding: 12 }}>
          <div>
            public_number: <strong>{checkout.init.public_number}</strong>
          </div>
          <div>status: {checkout.init.status}</div>
          <div>
            total: {checkout.init.amount_total_cents} {checkout.init.currency}
          </div>

          <p style={{ marginTop: 8 }}>
            Siguiente paso: ir a <a href="/checkout">/checkout</a>
          </p>

          <button onClick={() => dispatch(resetCheckout())} style={{ width: '100%', padding: 10 }}>
            Reiniciar checkout
          </button>
        </div>
      )}
    </div>
  );
}
