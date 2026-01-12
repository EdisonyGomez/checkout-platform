import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { PrismaService } from '../../infra/db/prisma.service';
import { StockStatus, TransactionStatus } from '@prisma/client';

/**
 * Service encargado de:
 *  - Validar integridad del evento recibido (checksum)
 *  - Actualizar transacción y stock según el estado informado por el proveedor
 */
@Injectable()
export class WebhooksService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Verifica el checksum del evento según la especificación del proveedor.
   * El proveedor envía:
   *  - signature.properties (lista de rutas dentro del payload)
   *  - signature.checksum (hash esperado)
   *  - timestamp
   *
   * Se calcula SHA256(concat(values of properties) + timestamp + events_secret)
   * y se compara contra x-event-checksum.
   */
  private verifyChecksum(payload: any, checksumHeader: string) {
    const secret = this.config.get<string>('PAYMENT_EVENTS_SECRET');
    if (!secret) throw new Error('Falta PAYMENT_EVENTS_SECRET');

    const signature = payload?.signature;
    const properties: string[] = signature?.properties ?? [];
    const timestamp: string = signature?.timestamp;

    if (!Array.isArray(properties) || !timestamp) {
      return false;
    }

    const values = properties
      .map((path) => this.getByPath(payload, path))
      .join('');

    const raw = `${values}${timestamp}${secret}`;
    const computed = createHash('sha256').update(raw).digest('hex');

    return computed === checksumHeader;
  }

  /**
   * Lee un valor de un objeto usando una ruta tipo "data.transaction.status".
   * Se usa para construir el string de verificación del checksum.
   */
  private getByPath(obj: any, path: string): string {
    const parts = path.split('.');
    let cur: any = obj;
    for (const p of parts) cur = cur?.[p];
    return cur == null ? '' : String(cur);
  }

  /**
   * Procesa el evento del proveedor.
   * Primero valida integridad. Luego actualiza nuestra transacción por reference (public_number).
   */
  async handleProviderEvent(input: { checksum: string; payload: any }) {
    const { payload, checksum } = input;

    const isValid = this.verifyChecksum(payload, checksum);
    if (!isValid) {
      return { accepted: false, reason: 'CHECKSUM_INVALIDO' };
    }

    const tx = payload?.data?.transaction;
    const reference: string | undefined = tx?.reference;
    const status: string | undefined = tx?.status;
    const providerId: string | undefined = tx?.id;

    if (!reference || !status) {
      return { accepted: true, ignored: true, reason: 'EVENTO_SIN_REFERENCE_O_STATUS' };
    }

    // Busca transacción local por public_number (reference)
    const local = await this.prisma.transaction.findUnique({
      where: { public_number: reference },
      select: { id: true, status: true, stock_item_id: true },
    });

    if (!local) {
      return { accepted: true, ignored: true, reason: 'TRANSACCION_LOCAL_NO_ENCONTRADA' };
    }

    // Idempotencia: si ya no está PENDING, no rehacemos cambios
    if (local.status !== TransactionStatus.PENDING) {
      return { accepted: true, idempotent_replay: true };
    }

    // Mapeo de estados del proveedor a estados internos
    const normalized = status.toUpperCase();
    const isApproved = normalized === 'APPROVED';
    const isDeclined = normalized === 'DECLINED';
    const isError = normalized === 'ERROR' || normalized === 'VOIDED';

    if (!local.stock_item_id) {
      await this.prisma.transaction.update({
        where: { id: local.id },
        data: {
          status: isApproved ? TransactionStatus.APPROVED : isDeclined ? TransactionStatus.DECLINED : TransactionStatus.ERROR,
          wompi_transaction_id: providerId,
          wompi_reference: reference,
        },
      });
      return { accepted: true, updated: true, without_stock: true };
    }

    return this.prisma.$transaction(async (db) => {
      if (isApproved) {
        await db.stockItem.update({
          where: { id: local.stock_item_id! },
          data: { status: StockStatus.SOLD, reserved_until: null },
        });

        await db.transaction.update({
          where: { id: local.id },
          data: {
            status: TransactionStatus.APPROVED,
            wompi_transaction_id: providerId,
            wompi_reference: reference,
          },
        });

        return { accepted: true, updated: true, status: 'APPROVED' };
      }

      if (isDeclined || isError) {
        await db.stockItem.update({
          where: { id: local.stock_item_id! },
          data: { status: StockStatus.AVAILABLE, reserved_until: null, reserved_tx_id: null },
        });

        await db.transaction.update({
          where: { id: local.id },
          data: {
            status: isDeclined ? TransactionStatus.DECLINED : TransactionStatus.ERROR,
            wompi_transaction_id: providerId,
            wompi_reference: reference,
          },
        });

        return { accepted: true, updated: true, status: isDeclined ? 'DECLINED' : 'ERROR' };
      }

      // Si el proveedor sigue PENDING, no cambiamos nada
      return { accepted: true, updated: false, status: 'PENDING' };
    });
  }
}
