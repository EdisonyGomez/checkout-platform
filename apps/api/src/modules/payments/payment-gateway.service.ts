import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

/**
 * Service responsable de comunicarse con el proveedor de pagos (Wompi).
 * Mantiene la integración aislada del resto del dominio.
 */
@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Obtiene la URL base del sandbox del proveedor.
   */
  private baseUrl(): string {
    const url = this.config.get<string>('PAYMENT_BASE_URL');
    if (!url) throw new Error('Falta PAYMENT_BASE_URL');
    return url;
  }

  /**
   * Retorna la llave pública del comercio (sandbox).
   * Se usa para tokenizar tarjetas y consultar merchant.
   */
  private publicKey(): string {
    const key = this.config.get<string>('PAYMENT_PUBLIC_KEY');
    if (!key) throw new Error('Falta PAYMENT_PUBLIC_KEY');
    return key;
  }

  /**
   * Retorna la llave privada del comercio (sandbox).
   * Se usa para crear transacciones desde backend.
   */
  private privateKey(): string {
    const key = this.config.get<string>('PAYMENT_PRIVATE_KEY');
    if (!key) throw new Error('Falta PAYMENT_PRIVATE_KEY');
    return key;
  }

  /**
   * Retorna el secreto de integridad.
   * Se usa para generar la firma SHA256 requerida por el API al crear transacciones.
   */
  private integritySecret(): string {
    const secret = this.config.get<string>('PAYMENT_INTEGRITY_SECRET');
    if (!secret) throw new Error('Falta PAYMENT_INTEGRITY_SECRET');
    return secret;
  }

  /**
   * Genera la firma de integridad (SHA256) requerida por el proveedor.
   * Fórmula: SHA256("<reference><amount_in_cents><currency><integrity_secret>")
   */
  private buildIntegritySignature(input: {
    reference: string;
    amount_in_cents: number;
    currency: string;
  }): string {
    const raw = `${input.reference}${input.amount_in_cents}${input.currency}${this.integritySecret()}`;
    return createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Obtiene la información del comercio (merchant) desde el proveedor.
   * De aquí se extraen los acceptance tokens.
   */
  async getMerchant() {
    const res = await fetch(`${this.baseUrl()}/merchants/${this.publicKey()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(`Error obteniendo merchant: ${res.status} ${JSON.stringify(json)}`);
    }

    return json.data;
  }

  /**
   * Obtiene los acceptance tokens requeridos para crear transacciones:
   * - acceptance_token
   * - personal_data_auth_token
   */
  async getAcceptanceTokens() {
    const merchant = await this.getMerchant();
    return {
      acceptance_token: merchant.presigned_acceptance.acceptance_token,
      personal_data_auth_token: merchant.presigned_personal_data_auth.acceptance_token,
    };
  }

  /**
   * Tokeniza una tarjeta en Sandbox. Retorna un token de un solo uso.
   * No persistimos datos sensibles de la tarjeta.
   */
  async tokenizeCard(input: {
    number: string;
    cvc: string;
    exp_month: string;
    exp_year: string;
    card_holder: string;
  }) {
    const res = await fetch(`${this.baseUrl()}/tokens/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.publicKey()}`,
      },
      body: JSON.stringify(input),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(`Error tokenizando tarjeta: ${res.status} ${JSON.stringify(json)}`);
    }

    return { card_token: json.data.id as string };
  }

  /**
   * Crea una transacción real en el proveedor (Sandbox).
   * IMPORTANTE:
   * - Se envía `signature` (firma de integridad) calculada con SHA256.
   * - Se envían acceptance tokens obtenidos del merchant.
   */
  async createTransaction(input: {
    amount_in_cents: number;
    currency: string;
    reference: string;
    customer_email: string;
    acceptance_token: string;
    personal_data_auth_token: string;
    card_token: string;
    installments: number;
  }) {
    const signature = this.buildIntegritySignature({
      reference: input.reference,
      amount_in_cents: input.amount_in_cents,
      currency: input.currency,
    });

    const res = await fetch(`${this.baseUrl()}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.privateKey()}`,
      },
      body: JSON.stringify({
        amount_in_cents: input.amount_in_cents,
        currency: input.currency,
        reference: input.reference,
        customer_email: input.customer_email,
        acceptance_token: input.acceptance_token,
        accept_personal_auth: input.personal_data_auth_token,

        signature,

        payment_method: {
          type: 'CARD',
          token: input.card_token,
          installments: input.installments,
        },
      }),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new Error(`Error creando transacción en proveedor: ${JSON.stringify(json)}`);
    }

    return {
      provider_transaction_id: json.data.id,
      provider_status: json.data.status,
      provider_reference: json.data.reference,
    };
  }
}
