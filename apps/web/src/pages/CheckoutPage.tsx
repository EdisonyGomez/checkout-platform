import { useAppSelector } from '../app/hooks';

export default function CheckoutPage() {
  const checkout = useAppSelector((s) => s.checkout);

  if (!checkout.init) {
    return (
      <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
        <p>No hay checkout iniciado. Vuelve a <a href="/">/</a></p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 720, margin: '24px auto', padding: 16 }}>
      <h2>Checkout</h2>
      <div>public_number: <strong>{checkout.init.public_number}</strong></div>
      <div>status: {checkout.init.status}</div>
      <p>Siguiente paso: aquí vamos a implementar pay + polling.</p>
      <p><a href="/">Volver a productos</a></p>
    </div>
  );
}
