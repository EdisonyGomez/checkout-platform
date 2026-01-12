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
  await app.listen(process.env.PORT ?? 3000);


}
bootstrap();
