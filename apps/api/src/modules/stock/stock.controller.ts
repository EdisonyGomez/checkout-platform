import { Controller, Post } from '@nestjs/common';
import { StockService } from './stock.service';

@Controller('api/stock')
export class StockController {
  constructor(private readonly service: StockService) {}

  @Post('release-expired')
  async releaseExpired() {
    return this.service.releaseExpiredReservations();
  }
}
