import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class TokenizeCardDto {
  @IsString() @IsNotEmpty()
  card_holder!: string;

  @IsString() @IsNotEmpty()
  @Matches(/^\d{13,19}$/) // VISA/MC típicamente 16, pero aceptamos rango
  number!: string;

  @IsString() @IsNotEmpty()
  @Matches(/^\d{3,4}$/)
  cvc!: string;

  @IsString() @IsNotEmpty()
  @Length(2, 2)
  exp_month!: string; // "08"

  @IsString() @IsNotEmpty()
  @Length(2, 2)
  exp_year!: string; // "28"
}
