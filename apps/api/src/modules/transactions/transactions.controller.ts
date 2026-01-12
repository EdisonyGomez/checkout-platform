import { Controller, Get, Param, Post } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { TransactionsSyncService } from './transactions-sync.service';

/**
 * Controller encargado de consultas de transacciones.
 * Se usa principalmente para status polling desde el cliente.
 */
@Controller('api/transactions')
export class TransactionsController {
   constructor(
    private readonly prisma: PrismaService,
    private readonly syncService: TransactionsSyncService,
  ) {}

/**
   * Retorna el estado actual de una transacción usando el public_number.
   * Se usa para status polling desde el cliente.
   */
  @Get(':publicNumber/status')
  async getTransactionStatus(@Param('publicNumber') publicNumber: string) {
    const tx = await this.prisma.transaction.findUnique({
      where: { public_number: publicNumber },
      select: {
        id: true,
        public_number: true,
        status: true,
        wompi_transaction_id: true,
        stock_item_id: true,
        updated_at: true,
      },
    });

    if (!tx) return { found: false, reason: 'TRANSACTION_NOT_FOUND' };

    return { found: true, ...tx };
  }

  /**
   * Fallback de reconciliación: consulta al proveedor el estado real y aplica cambios en DB.
   * Útil cuando el webhook no llega (localhost).
   */
  @Post(':publicNumber/sync')
  async sync(@Param('publicNumber') publicNumber: string) {
    return this.syncService.syncByPublicNumber(publicNumber);
  }
}