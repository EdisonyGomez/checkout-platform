import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { StockStatus, TransactionStatus } from '@prisma/client';

const BASE_FEE_CENTS = 3000;       // fee base fija
const DEFAULT_DELIVERY_FEE_CENTS = 5000; // fee delivery dummy (luego lo puedes calcular)
const RESERVATION_TTL_MINUTES = 10;

function makePublicNumber() {
  // Simple y legible. Puedes mejorarlo con secuencias luego.
  const now = new Date();
  const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const rand = Math.random().toString(16).slice(2, 8).toUpperCase();
  return `TX-${yyyymmdd}-${rand}`;
}

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  async initCheckout(input: {
    idempotencyKey: string;
    productId: string;
    customer: { full_name: string; email: string; phone?: string };
    delivery: { address_line: string; city: string; state: string; postal_code?: string; notes?: string };
  }) {
    const { idempotencyKey, productId } = input;

    if (!idempotencyKey) throw new BadRequestException('Falta header Idempotency-Key');

    // 1) Idempotencia: si ya existe transacción con esa key, devuélvela
    const existing = await this.prisma.transaction.findUnique({
      where: { idempotency_key: idempotencyKey },
      select: {
        id: true,
        public_number: true,
        status: true,
        amount_total_cents: true,
        currency: true,
        stock_item_id: true,
        updated_at: true,
        // no tenemos reserved_until en Transaction, pero lo guardamos en StockItem
      },
    });

    if (existing) {
      const stock = existing.stock_item_id
        ? await this.prisma.stockItem.findUnique({
            where: { id: existing.stock_item_id },
            select: { reserved_until: true },
          })
        : null;

      return {
        transaction_id: existing.id,
        public_number: existing.public_number,
        status: existing.status,
        amount_total_cents: existing.amount_total_cents,
        currency: existing.currency,
        stock_item_id: existing.stock_item_id,
        reserved_until: stock?.reserved_until ?? null,
        idempotent_replay: true,
      };
    }

    // 2) Cargar producto (precio)
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price_cents: true, currency: true },
    });

    if (!product) throw new BadRequestException('Producto no existe');

    const fee_base_cents = BASE_FEE_CENTS;
    const fee_delivery_cents = DEFAULT_DELIVERY_FEE_CENTS;
    const amount_product_cents = product.price_cents;
    const amount_total_cents = amount_product_cents + fee_base_cents + fee_delivery_cents;

    const reservedUntil = new Date(Date.now() + RESERVATION_TTL_MINUTES * 60 * 1000);

    // 3) Transacción DB: crear customer+delivery, reservar stock, crear transaction
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // 3.1 Customer upsert por email (evita duplicar clientes)
        const customer = await tx.customer.upsert({
          where: { email: input.customer.email },
          update: {
            full_name: input.customer.full_name,
            phone: input.customer.phone,
          },
          create: {
            full_name: input.customer.full_name,
            email: input.customer.email,
            phone: input.customer.phone,
          },
          select: { id: true },
        });

        const delivery = await tx.delivery.create({
          data: {
            customer_id: customer.id,
            address_line: input.delivery.address_line,
            city: input.delivery.city,
            state: input.delivery.state,
            postal_code: input.delivery.postal_code,
            notes: input.delivery.notes,
            fee_cents: fee_delivery_cents,
          },
          select: { id: true },
        });

        // 3.2 Buscar 1 stock item disponible
        // Nota: findFirst + update condicional. Si hay race, el updateMany nos protege.
        const candidate = await tx.stockItem.findFirst({
          where: {
            product_id: product.id,
            status: StockStatus.AVAILABLE,
          },
          orderBy: { created_at: 'asc' },
          select: { id: true },
        });

        if (!candidate) {
          throw new ConflictException('Sin stock disponible');
        }

        // Creamos el tx id primero para amarrar la reserva
        const transaction = await tx.transaction.create({
          data: {
            idempotency_key: idempotencyKey,
            public_number: makePublicNumber(),
            product_id: product.id,
            customer_id: customer.id,
            delivery_id: delivery.id,
            amount_product_cents,
            fee_base_cents,
            fee_delivery_cents,
            amount_total_cents,
            currency: product.currency,
            status: TransactionStatus.PENDING,
          },
          select: { id: true, public_number: true, status: true, amount_total_cents: true, currency: true },
        });

        // 3.3 Reservar atómicamente SOLO si sigue AVAILABLE
        const updated = await tx.stockItem.updateMany({
          where: {
            id: candidate.id,
            status: StockStatus.AVAILABLE,
          },
          data: {
            status: StockStatus.RESERVED,
            reserved_until: reservedUntil,
            reserved_tx_id: transaction.id,
          },
        });

        if (updated.count !== 1) {
          // alguien lo tomó primero
          throw new ConflictException('No fue posible reservar stock, reintenta');
        }

        // 3.4 Guardar stock_item_id en transaction
        const txUpdated = await tx.transaction.update({
          where: { id: transaction.id },
          data: { stock_item_id: candidate.id },
          select: { id: true, public_number: true, status: true, amount_total_cents: true, currency: true },
        });

        return {
          transaction_id: txUpdated.id,
          public_number: txUpdated.public_number,
          status: txUpdated.status,
          amount_total_cents: txUpdated.amount_total_cents,
          currency: txUpdated.currency,
          stock_item_id: candidate.id,
          reserved_until: reservedUntil.toISOString(),
          idempotent_replay: false,
        };
      });

      return result;
    } catch (e: any) {
      // Si la key ya existe por race
      if (e?.code === 'P2002') {
        // unique violation (idempotency_key o public_number)
        throw new ConflictException('Conflicto de idempotencia, reintenta con la misma key');
      }
      throw e;
    }
  }
}
