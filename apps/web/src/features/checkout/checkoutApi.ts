const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000';

export type InitCheckoutInput = {
  product_id: string;
  customer: { full_name: string; email: string; phone?: string };
  delivery: { address_line: string; city: string; state: string; postal_code?: string };
};

export type InitCheckoutResponse = {
  transaction_id: string;
  public_number: string;
  status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
  amount_total_cents: number;
  currency: string;
  stock_item_id: string | null;
  reserved_until?: string | null;
};

export async function checkoutInit(input: InitCheckoutInput, idempotencyKey: string) {
  const res = await fetch(`${API_BASE}/api/checkout/init`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Error init (${res.status}) ${msg}`);
  }

  return (await res.json()) as InitCheckoutResponse;
}
export type PayInput = {
  public_number: string;
  card: { number: string; cvc: string; exp_month: string; exp_year: string; holder: string };
};

export async function checkoutPay(input: PayInput) {
  const res = await fetch(`${API_BASE}/api/checkout/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Error pay (${res.status}) ${msg}`);
  }

  return res.json();
}

export type StatusResponse =
  | { found: false; reason: string }
  | {
    found: true;
    id: string;
    public_number: string;
    status: 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';
    wompi_transaction_id: string | null;
    stock_item_id: string | null;
    updated_at: string;
  };

export async function fetchStatus(publicNumber: string) {
  const res = await fetch(`${API_BASE}/api/transactions/${publicNumber}/status`);
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`Error status (${res.status}) ${msg}`);
  }
  return (await res.json()) as StatusResponse;
}
