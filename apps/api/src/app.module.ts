import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/db/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { ConfigModule } from '@nestjs/config';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { StockModule } from './modules/stock/stock.module';


@Module({
imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env'],
    }),
    PrismaModule,
    ProductsModule,
    CheckoutModule,
    StockModule,
  ], controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
