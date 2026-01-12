import { Body, Controller, Headers, Post } from '@nestjs/common';
import { CheckoutInitDto } from './dto/checkout-init.dto';
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
}
