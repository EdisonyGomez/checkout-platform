import { Module } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { WompiWebhookService } from './wompi-webhook.service';
import { PrismaService } from 'src/infra/db/prisma.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentGatewayService,WompiWebhookService, PrismaService],
  exports: [PaymentGatewayService],
})
export class PaymentsModule {}
