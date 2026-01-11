export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';

export type ProductDto = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: 'COP';
  image_url?: string | null;
  available_units: number;
};

export type InitCheckoutResponseDto = {
  transactionId: string;
  transactionNumber: string;
  pricing: {
    product_cents: number;
    base_fee_cents: number;
    delivery_fee_cents: number;
    total_cents: number;
    currency: 'COP';
  };
};
