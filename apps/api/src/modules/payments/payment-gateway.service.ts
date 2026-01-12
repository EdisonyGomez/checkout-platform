import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type MerchantResponse = {
  data: {
    presigned_acceptance: { acceptance_token: string };
    presigned_personal_data_auth: { acceptance_token: string };
  };
};

type TokenizeCardResponse = { data: { id: string } };


@Injectable()
export class PaymentGatewayService {
  constructor(private readonly config: ConfigService) { }

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


  async tokenizeCard(input: {
    number: string;
    cvc: string;
    exp_month: string; // "08"
    exp_year: string;  // "28"
    card_holder: string;
  }) {
    const url = `${this.baseUrl()}/tokens/cards`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.publicKey()}`,
      },
      body: JSON.stringify(input),
    });

    const json = (await res.json()) as TokenizeCardResponse | any;

    if (!res.ok) {
      // NO imprimas tarjeta/cvc. Solo error del proveedor.
      throw new Error(`Error tokenizando tarjeta: ${res.status} ${JSON.stringify(json)}`);
    }

    return { card_token: json.data.id };
  }


}


