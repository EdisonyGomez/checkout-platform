import { Module } from '@nestjs/common';
import { TransactionsController } from './transactions.controller';
import { TransactionsSyncService } from './transactions-sync.service';
import { PrismaService } from '../../infra/db/prisma.service';
import { ConfigService } from '@nestjs/config';

/**
 * Módulo de consultas de transacciones.
 * Incluye endpoints de polling y lectura.
 */
@Module({
  controllers: [TransactionsController],
    providers: [TransactionsSyncService, PrismaService, ConfigService],

})
export class TransactionsModule {}
