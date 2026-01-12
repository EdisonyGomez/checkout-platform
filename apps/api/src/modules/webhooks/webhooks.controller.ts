import { BadRequestException, Controller, Headers, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { WebhooksService } from './webhooks.service';

/**
 * Controller encargado de recibir eventos del proveedor de pagos.
 * El proveedor notificará cambios de estado de transacciones (PENDING -> APPROVED/DECLINED/ERROR).
 */
@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly service: WebhooksService) {}

  /**
   * Recibe eventos del proveedor y valida su integridad con el checksum.
   * Si el evento es válido, reconcilia el estado en nuestra base de datos.
   */
  @Post('events')
  async handleEvent(
    @Req() req: Request,
    @Headers('x-event-checksum') checksum: string,
  ) {
    if (!checksum) {
      throw new BadRequestException('Falta header x-event-checksum');
    }

    return this.service.handleProviderEvent({
      checksum,
      payload: req.body,
    });
  }
}
