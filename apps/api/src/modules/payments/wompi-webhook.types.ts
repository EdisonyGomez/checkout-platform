export type WompiEventType = 'transaction.updated' | string;

export type WompiTransactionStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DECLINED'
  | 'ERROR'
  | 'VOIDED'
  | string;

export interface WompiWebhookPayload {
  event: WompiEventType;
  data: {
    transaction: {
      id: string; // id de Wompi
      reference?: string; // tu public_number o referencia enviada
      status: WompiTransactionStatus;
      amount_in_cents?: number;
      currency?: string;
      payment_method_type?: string;
    };
  };
  sent_at?: string;
  signature?: unknown;
  id?: string; // algunos eventos traen id en raíz
}
