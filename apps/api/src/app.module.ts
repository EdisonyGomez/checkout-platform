import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './infra/db/prisma.module';
import { ProductsModule } from './modules/products/products.module';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['apps/api/.env', '.env']
    }),
    PrismaModule,
    ProductsModule,
  ], controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
