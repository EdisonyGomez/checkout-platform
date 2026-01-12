import crypto from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'src/infra/db/prisma.service';
import { StockStatus, TransactionStatus } from '@prisma/client';

type WompiStatus = 'PENDING' | 'APPROVED' | 'DECLINED' | 'ERROR' | 'VOIDED' | string;

interface WompiWebhookPayload {
  event: string;
  data: {
    transaction: {
      id: string; // wompi transaction id
      status: WompiStatus;
      reference?: string; // normalmente aquí mandas tu public_number
    };
  };
  sent_at?: string;
  id?: string; // si el evento trae id, lo usamos para idempotencia
}

@Injectable()
export class WompiWebhookService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Procesa el webhook:
   * - Valida firma HMAC
   * - Idempotencia por WebhookEvent.id
   * - Reconciliación: Transaction + StockItem
   */
  async handle(payload: WompiWebhookPayload, signatureHeader?: string) {
    this.verifySignatureOrThrow(payload, signatureHeader);

    const eventId = this.extractEventId(payload);
    const wompiTxId = payload.data.transaction.id;

    const exists = await this.prisma.webhookEvent.findUnique({
      where: { id: eventId },
      select: { id: true, status: true },
    });

    if (exists) {
      return { ok: true, ignored: true, reason: 'Evento duplicado' };
    }

    await this.prisma.webhookEvent.create({
      data: {
        id: eventId,
        eventType: payload.event ?? 'unknown',
        wompiTxId,
        payload: payload as unknown as object,
        status: 'RECEIVED',
      },
    });

    try {
      const result = await this.reconcile(payload);

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processedAt: new Date(),
          status: result.ignored ? 'IGNORED' : 'PROCESSED',
          errorMessage: null,
        },
      });

      return { ok: true, ...result };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Webhook error';

      await this.prisma.webhookEvent.update({
        where: { id: eventId },
        data: {
          processedAt: new Date(),
          status: 'ERROR',
          errorMessage: message,
        },
      });

      // Para sandbox/prueba técnica: respondemos 200 pero registramos el error
      return { ok: false, error: message };
    }
  }

  /**
   * Reconciliación:
   * - Encuentra Transaction por wompi_transaction_id o por public_number (reference)
   * - Solo si está PENDING cambia a APPROVED/DECLINED/ERROR
   * - Si APPROVED => StockItem.SOLD
   * - Si DECLINED/ERROR => libera StockItem (AVAILABLE) y limpia reserved_tx_id/reserved_until
   */
  private async reconcile(payload: WompiWebhookPayload): Promise<{ ignored: boolean; reason?: string }> {
    const wompiTxId = payload.data.transaction.id;
    const wompiStatus = payload.data.transaction.status;
    const reference = payload.data.transaction.reference;

    const mapped = this.mapWompiStatusToLocal(wompiStatus);
    if (!mapped) {
      return { ignored: true, reason: `Estado ignorado: ${wompiStatus}` };
    }

    const localTx = await this.prisma.transaction.findFirst({
      where: {
        OR: [
          { wompi_transaction_id: wompiTxId },
          reference ? { public_number: reference } : undefined,
        ].filter(Boolean) as any,
      },
      select: {
        id: true,
        status: true,
        stock_item_id: true,
        wompi_transaction_id: true,
        wompi_reference: true,
      },
    });

    if (!localTx) return { ignored: true, reason: 'Transacción local no encontrada' };
    if (localTx.status !== TransactionStatus.PENDING) {
      return { ignored: true, reason: 'Transacción ya finalizada' };
    }

    // Si hay stock asociado, validamos expiración consultando StockItem.reserved_until
    if (mapped === TransactionStatus.APPROVED && localTx.stock_item_id) {
      const stock = await this.prisma.stockItem.findUnique({
        where: { id: localTx.stock_item_id },
        select: { reserved_until: true, status: true },
      });

      if (stock?.reserved_until && stock.reserved_until < new Date()) {
        // Política recomendada: no permitir aprobación si expiró la reserva.
        // Se marca ERROR para revisión (o puedes DECLINED).
        await this.prisma.transaction.update({
          where: { id: localTx.id },
          data: { status: TransactionStatus.ERROR },
        });
        return { ignored: false, reason: 'Reserva expirada antes de aprobación' };
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.update({
        where: { id: localTx.id },
        data: {
          status: mapped,
          wompi_transaction_id: localTx.wompi_transaction_id ?? wompiTxId,
          // wompi_reference: opcional si lo estás guardando en pay/init (si llega otro valor, decide política)
          updated_at: new Date(),
        },
      });

      if (!localTx.stock_item_id) return;

      if (mapped === TransactionStatus.APPROVED) {
        await tx.stockItem.update({
          where: { id: localTx.stock_item_id },
          data: {
            status: StockStatus.SOLD,
            reserved_until: null,
            reserved_tx_id: localTx.id,
          },
        });
      } else if (mapped === TransactionStatus.DECLINED || mapped === TransactionStatus.ERROR) {
        await tx.stockItem.update({
          where: { id: localTx.stock_item_id },
          data: {
            status: StockStatus.AVAILABLE,
            reserved_until: null,
            reserved_tx_id: null,
          },
        });
      }
    });

    return { ignored: false };
  }

  private mapWompiStatusToLocal(wompiStatus: WompiStatus): TransactionStatus | null {
    switch (wompiStatus) {
      case 'APPROVED':
        return TransactionStatus.APPROVED;
      case 'DECLINED':
        return TransactionStatus.DECLINED;
      case 'ERROR':
      case 'VOIDED':
        return TransactionStatus.ERROR;
      case 'PENDING':
        return null; // seguimos pendientes
      default:
        return null;
    }
  }

  private extractEventId(payload: WompiWebhookPayload): string {
    if (payload.id && payload.id.trim().length > 0) return payload.id;

    const tx = payload.data?.transaction?.id ?? 'no-tx';
    const st = payload.data?.transaction?.status ?? 'no-status';
    const sentAt = payload.sent_at ?? 'no-sent-at';

    return crypto.createHash('sha256').update(`${payload.event}:${tx}:${st}:${sentAt}`).digest('hex');
  }

  private verifySignatureOrThrow(payload: unknown, signatureHeader?: string) {
    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) throw new UnauthorizedException('WOMPI_EVENTS_SECRET no configurado');
    if (!signatureHeader) throw new UnauthorizedException('Firma ausente');

    const expected = crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    const received = signatureHeader.replace(/^sha256=/i, '').trim();

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received, 'hex');
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Firma inválida');
    }
  }
}
