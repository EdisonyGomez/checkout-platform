import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'crypto';
import { PrismaService } from '../../infra/db/prisma.service';
import { StockStatus, TransactionStatus } from '@prisma/client';

type FinalStatus = 'APPROVED' | 'DECLINED' | 'ERROR' | 'PENDING';

/**
 * Service encargado de:
 *  - Validar integridad del evento recibido (checksum)
 *  - Aplicar idempotencia por evento (WebhookEvent)
 *  - Reconciliar estado de transacción y stock según el estado informado por el proveedor
 *
 * Convenciones usadas en este proyecto:
 *  - Header: x-event-checksum
 *  - Secret: PAYMENT_EVENTS_SECRET
 *  - Reference del evento: corresponde a public_number (nuestra referencia interna)
 */
@Injectable()
export class WebhooksService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) { }

  /**
   * Procesa el evento del proveedor.
   *
   * Flujo:
   *  1) Verifica el checksum del evento
   *  2) Aplica idempotencia: si el evento ya fue procesado, se ignora
   *  3) Busca la transacción local por public_number (reference del evento)
   *  4) Si la transacción no está en PENDING, se considera replay idempotente
   *  5) Si el estado cambia a APPROVED/DECLINED/ERROR, actualiza Transaction + StockItem atómicamente
   *  6) Registra el resultado final en WebhookEvent
   */
  async handleProviderEvent(input: { checksum: string; payload: any }) {
    const { payload, checksum } = input;

    // 1) Validación de integridad
    const isValid = this.verifyChecksum(payload, checksum);
    if (!isValid) {
      return { accepted: false, reason: 'CHECKSUM_INVALIDO' };
    }

    const eventId = this.extractEventId(payload);
    const eventType = String(payload?.event ?? 'unknown');
    const providerTxId: string | undefined = payload?.data?.transaction?.id;

    // 2) Idempotencia por evento
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (existing) {
      return { accepted: true, ignored: true, reason: 'EVENTO_DUPLICADO' };
    }

    await this.prisma.webhookEvent.create({
      data: {
        id: eventId,
        eventType,
        wompiTxId: providerTxId ?? null,
        payload,
        status: 'RECEIVED',
      },
    });

    try {
      // 3) Extraer datos mínimos del evento
      const tx = payload?.data?.transaction;
      const reference: string | undefined = tx?.reference; // public_number local
      const status: string | undefined = tx?.status;

      if (!reference || !status) {
        await this.markWebhookEvent(eventId, 'IGNORED', 'EVENTO_SIN_REFERENCE_O_STATUS');
        return { accepted: true, ignored: true, reason: 'EVENTO_SIN_REFERENCE_O_STATUS' };
      }

      // 4) Buscar transacción local por public_number (reference)
      const local = await this.prisma.transaction.findUnique({
        where: { public_number: reference },
        select: { id: true, status: true, stock_item_id: true },
      });

      if (!local) {
        await this.markWebhookEvent(eventId, 'IGNORED', 'TRANSACCION_LOCAL_NO_ENCONTRADA');
        return { accepted: true, ignored: true, reason: 'TRANSACCION_LOCAL_NO_ENCONTRADA' };
      }

      // 5) Idempotencia por estado de transacción
      if (local.status !== TransactionStatus.PENDING) {
        await this.markWebhookEvent(eventId, 'IGNORED', 'REPLAY_TRANSACCION_FINAL');
        return { accepted: true, idempotent_replay: true };
      }

      // 6) Mapeo de estados del proveedor a estados internos
      const normalized = String(status).toUpperCase();
      const isApproved = normalized === 'APPROVED';
      const isDeclined = normalized === 'DECLINED';
      const isError = normalized === 'ERROR' || normalized === 'VOIDED';

      // Si el proveedor sigue en PENDING (u otro estado desconocido), no cambiamos nada
      if (!isApproved && !isDeclined && !isError) {
        await this.markWebhookEvent(eventId, 'IGNORED', 'ESTADO_NO_FINAL');
        return { accepted: true, updated: false, status: 'PENDING' };
      }

      // Si no hay stock asociado, actualizamos solo transacción
      if (!local.stock_item_id) {
        await this.prisma.transaction.update({
          where: { id: local.id },
          data: {
            status: isApproved
              ? TransactionStatus.APPROVED
              : isDeclined
                ? TransactionStatus.DECLINED
                : TransactionStatus.ERROR,
            wompi_transaction_id: providerTxId ?? null,
            // wompi_reference no se asigna con nuestra reference interna (public_number)
            // porque es unique y debe reservarse para un valor propio del proveedor si aplica.
          },
        });

        await this.markWebhookEvent(eventId, 'PROCESSED', null);
        return { accepted: true, updated: true, without_stock: true };
      }

      // 7) Reconciliación atómica Transaction + StockItem
      const result = await this.prisma.$transaction(async (db) => {
        if (isApproved) {
          const stockItemId = local.stock_item_id;
          if (!stockItemId) {
            // No debería pasar porque ya validamos arriba, pero deja el guard por tipos
            return { accepted: true, updated: true, without_stock: true };
          }

          await db.stockItem.update({
            where: { id: stockItemId },
            data: { /* ... */ },
          });


          await db.transaction.update({
            where: { id: local.id },
            data: {
              status: TransactionStatus.APPROVED,
              wompi_transaction_id: providerTxId ?? null,
            },
          });

          const finalStatus: FinalStatus = 'APPROVED';
          return { accepted: true, updated: true, status: finalStatus };

        }

        // DECLINED o ERROR => liberar stock
        const stockItemId = local.stock_item_id;
        if (!stockItemId) {
          // No debería pasar porque ya validamos arriba, pero deja el guard por tipos
          return { accepted: true, updated: true, without_stock: true };
        }

        await db.stockItem.update({
          where: { id: stockItemId },
          data: { /* ... */ },
        });

        await db.transaction.update({
          where: { id: local.id },
          data: {
            status: isDeclined ? TransactionStatus.DECLINED : TransactionStatus.ERROR,
            wompi_transaction_id: providerTxId ?? null,
          },
        });

        const finalStatus: FinalStatus = isDeclined ? 'DECLINED' : 'ERROR';
        return { accepted: true, updated: true, status: finalStatus };

      });

      await this.markWebhookEvent(eventId, 'PROCESSED', null);
      return result;
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'ERROR_INTERNO_WEBHOOK';
      await this.markWebhookEvent(eventId, 'ERROR', message);

      // Importante: normalmente se responde 200 para evitar reintentos infinitos,
      // y el error queda registrado en WebhookEvent.
      return { accepted: true, ignored: true, reason: 'ERROR_INTERNO_WEBHOOK' };
    }
  }

  /**
   * Verifica el checksum del evento según la especificación del proveedor.
   *
   * El proveedor envía en el payload:
   *  - signature.properties (lista de rutas dentro del payload)
   *  - signature.timestamp
   *
   * Se calcula:
   *  SHA256( concat(values(properties)) + timestamp + PAYMENT_EVENTS_SECRET )
   *
   * y se compara contra el header x-event-checksum.
   */
  private verifyChecksum(payload: any, checksumHeader: string) {
    const secret = this.config.get<string>('PAYMENT_EVENTS_SECRET');
    if (!secret) throw new Error('Falta PAYMENT_EVENTS_SECRET');

    const signature = payload?.signature;
    const properties: string[] = signature?.properties ?? [];
    const timestamp: string = signature?.timestamp;

    if (!Array.isArray(properties) || properties.length === 0 || !timestamp) {
      return false;
    }

    const values = properties.map((path) => this.getByPath(payload, path)).join('');
    const raw = `${values}${timestamp}${secret}`;
    const computedHex = createHash('sha256').update(raw).digest('hex');

    const receivedHex = String(checksumHeader ?? '').trim();

    try {
      const a = Buffer.from(computedHex, 'hex');
      const b = Buffer.from(receivedHex, 'hex');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
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
   * Obtiene un ID estable para el evento.
   *
   * Si el proveedor envía payload.id, se usa como idempotency key.
   * Si no existe, se genera un hash estable con:
   *  event + tx.id + tx.status + signature.timestamp
   */
  private extractEventId(payload: any): string {
    const rootId = payload?.id;
    if (typeof rootId === 'string' && rootId.trim()) return rootId;

    const txId = payload?.data?.transaction?.id ?? 'no-tx';
    const status = payload?.data?.transaction?.status ?? 'no-status';
    const ts = payload?.signature?.timestamp ?? payload?.sent_at ?? 'no-ts';
    const eventType = payload?.event ?? 'unknown';

    return createHash('sha256').update(`${eventType}:${txId}:${status}:${ts}`).digest('hex');
  }

  /**
   * Marca el estado final del WebhookEvent.
   */
  private async markWebhookEvent(
    eventId: string,
    status: 'PROCESSED' | 'IGNORED' | 'ERROR',
    errorMessage: string | null,
  ) {
    await this.prisma.webhookEvent.update({
      where: { id: eventId },
      data: {
        processedAt: new Date(),
        status,
        errorMessage: errorMessage ?? null,
      },
    });
  }
}
