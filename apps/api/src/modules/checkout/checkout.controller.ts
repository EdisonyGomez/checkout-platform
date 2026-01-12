import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CheckoutInitDto } from './dto/checkout-init.dto';
import { CheckoutPayDto } from './dto/checkout-pay.dto';
import { CheckoutService } from './checkout.service';

@Controller('api/checkout')
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('init')
  async init(
    @Headers('idempotency-key') idempotencyKey: string,
    @Body() body: CheckoutInitDto,
  ) {
    return this.service.initCheckout({
      idempotencyKey,
      productId: body.product_id,
      customer: body.customer,
      delivery: body.delivery,
    });
  }

  /**
   * Dispara el pago real en el proveedor para una transacción local existente (PENDING).
   * No crea una nueva transacción local; usa la existente (transaction_id).
   */
  @Post('pay')
  async pay(@Body() body: CheckoutPayDto) {
    return this.service.payCheckout({
      transactionId: body.transaction_id,
      installments: body.installments,
      card: {
        number: body.card_number,
        cvc: body.card_cvc,
        exp_month: body.card_exp_month,
        exp_year: body.card_exp_year,
        card_holder: body.card_holder,
      },
    });
  }
}

