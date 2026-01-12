import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller'; 
import { ProductsRepository } from './products.repository';
import { ListProductsUseCase } from './use-cases/list-products.usecase'; 

@Module({
  controllers: [ProductsController],
  providers: [ProductsRepository, ListProductsUseCase],
})
export class ProductsModule {}
