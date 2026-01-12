import { Controller, Get } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly gateway: PaymentGatewayService) {}

  @Get('merchant')
  async merchant() {
    const data = await this.gateway.getMerchant();

    return {
      acceptance_token_present: Boolean(data.presigned_acceptance?.acceptance_token),
      personal_data_auth_token_present: Boolean(data.presigned_personal_data_auth?.acceptance_token),
    };
  }
}
