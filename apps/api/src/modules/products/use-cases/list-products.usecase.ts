import { Injectable } from '@nestjs/common';
import { ProductsRepository } from '../products.repository';

@Injectable()
export class ListProductsUseCase {
  constructor(private readonly repo: ProductsRepository) {}

  async execute() {
    return this.repo.listProductsWithAvailableUnits();
  }
}
