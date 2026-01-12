/* eslint-disable no-console */
import 'dotenv/config';
import { PrismaClient, StockStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const prisma = new PrismaClient({ adapter });

type SeedProduct = {
  sku: string;
  name: string;
  description?: string;
  price_cents: number;
  currency?: string;
  image_url?: string;
  units: number;
};

async function ensureAvailableStock(productId: string, desiredUnits: number) {
  const available = await prisma.stockItem.count({
    where: { product_id: productId, status: StockStatus.AVAILABLE },
  });

  const missing = desiredUnits - available;
  if (missing <= 0) return;

  await prisma.stockItem.createMany({
    data: Array.from({ length: missing }, () => ({
      product_id: productId,
      status: StockStatus.AVAILABLE,
    })),
  });
}

async function main() {
  const products: SeedProduct[] = [
    {
      sku: 'SKU-TEE-001',
      name: 'Camiseta básica',
      description: 'Camiseta algodón, cómoda para el día a día.',
      price_cents: 120000,
      currency: 'COP',
      units: 12,
    },
    {
      sku: 'SKU-MUG-001',
      name: 'Taza premium',
      description: 'Taza cerámica resistente, ideal para café.',
      price_cents: 125000,
      currency: 'COP',
      units: 8,
    },
    {
      sku: 'SKU-CAP-001',
      name: 'Gorra clásica',
      description: 'Gorra ajustable con bordado minimalista.',
      price_cents: 38000,
      currency: 'COP',
      units: 10,
    },
  ];

  for (const p of products) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
        currency: p.currency ?? 'COP',
        image_url: p.image_url,
      },
      create: {
        sku: p.sku,
        name: p.name,
        description: p.description,
        price_cents: p.price_cents,
        currency: p.currency ?? 'COP',
        image_url: p.image_url,
      },
      select: { id: true, sku: true, name: true },
    });

    await ensureAvailableStock(product.id, p.units);

    const available = await prisma.stockItem.count({
      where: { product_id: product.id, status: StockStatus.AVAILABLE },
    });

    console.log(`✅ ${product.sku} - ${product.name} | AVAILABLE: ${available}`);
  }

  console.log('🌱 Seed completado.');
}

main()
  .catch((e) => {
    console.error('❌ Seed falló:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
