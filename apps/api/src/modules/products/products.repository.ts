import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { StockStatus } from '@prisma/client';

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listProductsWithAvailableUnits() {
    // Trae productos + conteo de stock AVAILABLE
    const products = await this.prisma.product.findMany({
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        sku: true,
        name: true,
        description: true,
        price_cents: true,
        currency: true,
        image_url: true,
        _count: {
          select: {
            stock_items: true, // ojo: esto cuenta TODOS los stock_items, no solo AVAILABLE
          },
        },
      },
    });

    // Como _count no filtra por status, hacemos agregación por separado (más correcto)
    const counts = await this.prisma.stockItem.groupBy({
      by: ['product_id', 'status'],
      where: { status: StockStatus.AVAILABLE },
      _count: { _all: true },
    });

    const map = new Map<string, number>();
    for (const c of counts) map.set(c.product_id, c._count._all);

    return products.map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description,
      price_cents: p.price_cents,
      currency: p.currency,
      image_url: p.image_url,
      available_units: map.get(p.id) ?? 0,
    }));
  }
}
