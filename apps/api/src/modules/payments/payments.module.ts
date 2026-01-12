import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { WompiWebhookService } from './wompi-webhook.service';
import { PrismaClient } from '@prisma/client';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentGatewayService,WompiWebhookService, PrismaClient],
  exports: [PaymentGatewayService],
})
export class PaymentsModule {}
