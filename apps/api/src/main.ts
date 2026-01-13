import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // elimina propiedades no declaradas en DTO
      forbidNonWhitelisted: true, // lanza error si llegan props extra
      transform: true,            // transforma payloads a DTOs
    }),
  );

  app.enableCors({
    origin: ['https://checkout-platform-web.vercel.app'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-event-checksum', 'x-signature'],
    credentials: false,
  });

  await app.listen(process.env.PORT ?? 3000);


}
bootstrap();
