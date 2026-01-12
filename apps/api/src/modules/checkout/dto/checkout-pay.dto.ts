import { IsInt, IsNotEmpty, IsString, Length, Matches, Max, Min } from 'class-validator';

/**
 * DTO para iniciar el pago con tarjeta a través del proveedor.
 * Recibe datos fake de tarjeta (sandbox) y el transaction_id local.
 */
export class CheckoutPayDto {
  @IsString()
  @IsNotEmpty()
  transaction_id!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,19}$/)
  card_number!: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/)
  card_cvc!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  card_exp_month!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 2)
  card_exp_year!: string;

  @IsString()
  @IsNotEmpty()
  card_holder!: string;

  @IsInt()
  @Min(1)
  @Max(36)
  installments!: number;
}
