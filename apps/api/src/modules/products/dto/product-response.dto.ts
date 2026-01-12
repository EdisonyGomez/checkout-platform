export type ProductResponseDto = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  price_cents: number;
  currency: string;
  image_url: string | null;
  available_units: number;
};
