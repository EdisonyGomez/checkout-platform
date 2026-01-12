import { IsEmail, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

export class CreateTransactionDto {
  @IsInt() @Min(1)
  amount_in_cents!: number;

  @IsString() @IsNotEmpty()
  currency!: string;

  @IsString() @IsNotEmpty()
  reference!: string;

  @IsEmail()
  customer_email!: string;

  @IsString() @IsNotEmpty()
  card_token!: string;

  @IsInt() @Min(1) @Max(36)
  installments!: number;
}
