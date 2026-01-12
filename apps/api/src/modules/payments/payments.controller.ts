import { Body, Controller, Get, Post } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { TokenizeCardDto } from './dto/tokenize-card.dto';

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

  @Post('tokenize-card')
  async tokenize(@Body() body: TokenizeCardDto) {
    return this.gateway.tokenizeCard({
      card_holder: body.card_holder,
      number: body.number,
      cvc: body.cvc,
      exp_month: body.exp_month,
      exp_year: body.exp_year,
    });
  }
}
