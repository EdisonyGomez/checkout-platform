import { Controller, Get } from '@nestjs/common';
import { ListProductsUseCase } from './use-cases/list-products.usecase';

@Controller('api/products')
export class ProductsController {
  constructor(private readonly listProducts: ListProductsUseCase) {}

  @Get()
  async getProducts() {
    return this.listProducts.execute();
  }
}
