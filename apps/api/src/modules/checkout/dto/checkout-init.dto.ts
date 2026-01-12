import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CustomerDto {
  @IsString() @IsNotEmpty()
  full_name!: string;

  @IsEmail()
  email!: string;

  @IsString() @IsOptional()
  phone?: string;
}

export class DeliveryDto {
  @IsString() @IsNotEmpty()
  address_line!: string;

  @IsString() @IsNotEmpty()
  city!: string;

  @IsString() @IsNotEmpty()
  state!: string;

  @IsString() @IsOptional()
  postal_code?: string;

  @IsString() @IsOptional()
  notes?: string;
}

export class CheckoutInitDto {
  @IsString() @IsNotEmpty()
  product_id!: string;

  customer!: CustomerDto;
  delivery!: DeliveryDto;
}
