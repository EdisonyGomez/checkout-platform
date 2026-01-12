import { Body, Controller, Headers, Post } from '@nestjs/common';
import { WompiWebhookService } from './wompi-webhook.service';
import type { WompiWebhookPayload } from './wompi-webhook.types';

@Controller('webhooks')
export class WompiWebhookController {
  constructor(private readonly service: WompiWebhookService) {}

  @Post('wompi')
  async wompi(
    @Body() payload: WompiWebhookPayload,
    @Headers('x-signature') signature: string | undefined,
  ) {
    // La respuesta 200 es importante para que el proveedor no reintente indefinidamente
    return this.service.handle(payload, signature);
  }
}
