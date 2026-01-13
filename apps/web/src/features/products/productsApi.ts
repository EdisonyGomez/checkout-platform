const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'https://checkout-platform.onrender.com/';

export type ProductDto = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: string;
  image_url?: string | null;
  available_units: number;
};

export async function fetchProducts(): Promise<ProductDto[]> {
  const res = await fetch(`${API_BASE}/api/products`);
  if (!res.ok) throw new Error(`Error products (${res.status})`);
  return res.json();
}
