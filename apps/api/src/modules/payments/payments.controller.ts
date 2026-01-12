import { Body, Controller, Get, Post } from '@nestjs/common';
import { PaymentGatewayService } from './payment-gateway.service';
import { TokenizeCardDto } from './dto/tokenize-card.dto';
import { CreateTransactionDto } from './dto/create-transaction.dto';

/**
 * Controller encargado de exponer endpoints relacionados
 * con el proveedor de pagos.
 *
 * Estos endpoints permiten validar que la integración
 * con Wompi Sandbox funciona correctamente.
 */
@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly gateway: PaymentGatewayService,
  ) {}

  /**
   * Endpoint de diagnóstico.
   * Permite verificar que:
   *  - El backend puede comunicarse con Wompi
   *  - Se pueden obtener los acceptance tokens
   *
   * NO retorna tokens reales por seguridad,
   * solo indica si están presentes.
   */
  @Get('merchant')
  async merchant() {
    const data = await this.gateway.getMerchant();

    return {
      acceptance_token_present: Boolean(
        data.presigned_acceptance?.acceptance_token,
      ),
      personal_data_auth_token_present: Boolean(
        data.presigned_personal_data_auth?.acceptance_token,
      ),
    };
  }

  /**
   * Tokeniza una tarjeta de crédito (sandbox).
   * Este endpoint:
   *  - Recibe datos estructuralmente válidos de tarjeta
   *  - Retorna un token de un solo uso
   *
   * El token será usado posteriormente para crear
   * una transacción real en Wompi.
   */
  @Post('tokenize-card')
  async tokenizeCard(@Body() body: TokenizeCardDto) {
    return this.gateway.tokenizeCard({
      card_holder: body.card_holder,
      number: body.number,
      cvc: body.cvc,
      exp_month: body.exp_month,
      exp_year: body.exp_year,
    });
  }


  /**
   * Crea una transacción real en Wompi Sandbox.
   * Flujo:
   *  1) Obtiene acceptance tokens del merchant
   *  2) Envía la creación de transacción con card_token y reference
   *
   * Este endpoint es temporal para validar la integración end-to-end
   * antes de conectarlo al flujo de /checkout/pay.
   */
  @Post('create-transaction')
  async createTransaction(@Body() body: CreateTransactionDto) {
    const tokens = await this.gateway.getAcceptanceTokens();

    return this.gateway.createTransaction({
      amount_in_cents: body.amount_in_cents,
      currency: body.currency,
      reference: body.reference,
      customer_email: body.customer_email,
      card_token: body.card_token,
      installments: body.installments,
      acceptance_token: tokens.acceptance_token,
      personal_data_auth_token: tokens.personal_data_auth_token,
    });
  }
}
