import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MerchantResponse = {
  data: {
    presigned_acceptance: { acceptance_token: string };
    presigned_personal_data_auth: { acceptance_token: string };
  };
};

@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) {}

  private baseUrl() {
    const v = this.config.get<string>('PAYMENT_BASE_URL');
    if (!v) throw new Error('Falta PAYMENT_BASE_URL');
    return v;
  }

  private publicKey() {
    const v = this.config.get<string>('PAYMENT_PUBLIC_KEY');
    if (!v) throw new Error('Falta PAYMENT_PUBLIC_KEY');
    return v;
  }

  async getMerchant() {
    const url = `${this.baseUrl()}/merchants/${this.publicKey()}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const json = (await res.json()) as MerchantResponse | any;

    if (!res.ok) {
      // No exponemos llaves, pero sí devolvemos error útil para debug
      throw new Error(`Error merchant: ${res.status} ${JSON.stringify(json)}`);
    }

    return json.data;
  }

  async getAcceptanceTokens() {
    const data = await this.getMerchant();
    return {
      acceptance_token: data.presigned_acceptance.acceptance_token,
      personal_data_auth_token: data.presigned_personal_data_auth.acceptance_token,
    };
  }
}
