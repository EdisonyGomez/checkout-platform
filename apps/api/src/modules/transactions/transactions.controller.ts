import { Controller, Get, Param } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';

/**
 * Controller encargado de consultas de transacciones.
 * Se usa principalmente para status polling desde el cliente.
 */
@Controller('api/transactions')
export class TransactionsController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retorna el estado actual de una transacción usando el public_number.
   *
   * Este endpoint NO cambia estado.
   * Solo permite al cliente conocer el resultado del pago.
   */
  @Get(':publicNumber/status')
  async getTransactionStatus(
    @Param('publicNumber') publicNumber: string,
  ) {
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

    if (!tx) {
      return {
        found: false,
        reason: 'TRANSACTION_NOT_FOUND',
      };
    }

    return {
      found: true,
      id: tx.id,
      public_number: tx.public_number,
      status: tx.status,
      wompi_transaction_id: tx.wompi_transaction_id,
      stock_item_id: tx.stock_item_id,
      updated_at: tx.updated_at,
    };
  }
}
