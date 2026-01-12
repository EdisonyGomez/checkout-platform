import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/db/prisma.service';
import { ConfigService } from '@nestjs/config';
import { StockStatus, TransactionStatus } from '@prisma/client';

type ProviderStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED' | string;

@Injectable()
export class TransactionsSyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) { }

  /**
   * Sincroniza una transacción consultando al proveedor por wompi_transaction_id.
   * Este endpoint es un fallback cuando el webhook no llega (localhost).
   */
  async syncByPublicNumber(publicNumber: string) {
    const local = await this.prisma.transaction.findUnique({
      where: { public_number: publicNumber },
      select: {
        id: true,
        public_number: true,
        status: true,
        stock_item_id: true,
        wompi_transaction_id: true,
      },
    });

    if (!local) return { found: false, reason: 'TRANSACTION_NOT_FOUND' };

    if (!local.wompi_transaction_id) {
      return { found: true, synced: false, reason: 'NO_PROVIDER_TRANSACTION_ID', status: local.status };
    }

    // Si ya finalizó localmente, no hacemos nada
    if (local.status !== TransactionStatus.PENDING) {
      return { found: true, synced: false, reason: 'ALREADY_FINAL', status: local.status };
    }

    const provider = await this.fetchProviderTransaction(local.wompi_transaction_id);
    const providerStatus = String(
      provider?.data?.status ??
      provider?.data?.transaction?.status ??
      provider?.status ??
      ''
    ).toUpperCase();
    const mapped = this.mapProviderStatus(providerStatus);
    if (!mapped) {
      return { found: true, synced: false, reason: 'PROVIDER_STATUS_NOT_FINAL', provider_status: providerStatus, status: local.status };
    }

    await this.prisma.$transaction(async (db) => {
      await db.transaction.update({
        where: { id: local.id },
        data: { status: mapped },
      });

      if (!local.stock_item_id) return;

      if (mapped === TransactionStatus.APPROVED) {
        await db.stockItem.update({
          where: { id: local.stock_item_id },
          data: { status: StockStatus.SOLD, reserved_until: null, reserved_tx_id: local.id },
        });
      }

      if (mapped === TransactionStatus.DECLINED || mapped === TransactionStatus.ERROR) {
        await db.stockItem.update({
          where: { id: local.stock_item_id },
          data: { status: StockStatus.AVAILABLE, reserved_until: null, reserved_tx_id: null },
        });
      }
    });

    return {
      found: true,
      synced: true,
      provider_status: providerStatus,
      status: mapped,
    };
  }

  /**
   * Consulta la transacción en Wompi por ID.
   * Usa PAYMENT_BASE_URL y PAYMENT_PRIVATE_KEY (prv_...).
   */
  private async fetchProviderTransaction(wompiTransactionId: string) {
    const baseUrl = this.config.get<string>('PAYMENT_BASE_URL');
    const privateKey = this.config.get<string>('PAYMENT_PRIVATE_KEY');

    if (!baseUrl) throw new Error('Falta PAYMENT_BASE_URL');
    if (!privateKey) throw new Error('Falta PAYMENT_PRIVATE_KEY');

    const url = `${baseUrl}/transactions/${wompiTransactionId}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${privateKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!res.ok) {
      const msg = await res.text().catch(() => '');
      throw new Error(`Provider GET transaction failed (${res.status}) ${msg}`);
    }

    return res.json();
  }

  /**
   * Mapea estado del proveedor a estado interno.
   * Retorna null si no es final (ej. PENDING).
   */
  private mapProviderStatus(status: ProviderStatus): TransactionStatus | null {
    switch (status) {
      case 'APPROVED':
        return TransactionStatus.APPROVED;
      case 'DECLINED':
        return TransactionStatus.DECLINED;
      case 'ERROR':
      case 'VOIDED':
        return TransactionStatus.ERROR;
      case 'PENDING':
        return null;
      default:
        return null;
    }
  }
}
