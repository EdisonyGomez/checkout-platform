/**
 * Contratos compartidos entre Web (React) y API (Nest).
 * - Mantener estos DTOs estables evita desalineación entre front/back.
 * - Los montos se expresan en centavos (amount_cents) para evitar errores de decimales.
 */
export type TransactionStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR';

/** DTO de producto para UI. `available_units` es el stock disponible en el momento de la consulta. */
export type ProductDto = {
  id: string;
  name: string;
  description?: string | null;
  price_cents: number;
  currency: 'COP';
  image_url?: string | null;
  available_units: number;
};

/**
 * Respuesta del inicio del checkout.
 * `transactionNumber` es el identificador legible para mostrar al usuario.
 * `pricing` es un snapshot para que el resumen no cambie si varían fees luego.
 */
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


