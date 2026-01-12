import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { StockStatus, TransactionStatus } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async releaseExpiredReservations() {
    const now = new Date();

    // 1) Encuentra reservados vencidos (guardamos ids para reportar)
    const expired = await this.prisma.stockItem.findMany({
      where: {
        status: StockStatus.RESERVED,
        reserved_until: { lt: now },
      },
      select: { id: true, reserved_tx_id: true },
      take: 500, // evita cargas grandes; para test está perfecto
    });

    if (expired.length === 0) {
      return {
        released_count: 0,
        released_stock_item_ids: [],
        touched_transaction_ids: [],
      };
    }

    const stockIds = expired.map((x) => x.id);
    const txIds = expired.map((x) => x.reserved_tx_id).filter(Boolean) as string[];

    // 2) Libera stock
    const released = await this.prisma.stockItem.updateMany({
      where: { id: { in: stockIds } },
      data: {
        status: StockStatus.AVAILABLE,
        reserved_until: null,
        reserved_tx_id: null,
      },
    });

    // 3) (Opcional) marcar transacciones PENDING como ERROR por timeout
    // Solo si siguen PENDING
    const touchedTx = txIds.length
      ? await this.prisma.transaction.updateMany({
          where: {
            id: { in: txIds },
            status: TransactionStatus.PENDING,
          },
          data: { status: TransactionStatus.ERROR },
        })
      : { count: 0 };

    return {
      released_count: released.count,
      released_stock_item_ids: stockIds,
      touched_transaction_count: touchedTx.count,
      touched_transaction_ids: txIds,
    };
  }
}
