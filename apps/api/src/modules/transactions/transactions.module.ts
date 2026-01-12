import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';

/**
 * Módulo de consultas de transacciones.
 * Incluye endpoints de polling y lectura.
 */
@Module({
  controllers: [TransactionsController],
})
export class TransactionsModule {}
