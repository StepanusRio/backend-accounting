import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { NormalBalance } from 'generated/prisma';

export class CreateCustomerDto {
  @IsString()
  @IsNotEmpty()
  customerCode: string;

  @IsString()
  @IsNotEmpty()
  customerName: string;

  @IsNumber({}, { message: 'openingBalance must be a valid number' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  openingBalance?: number;

  @IsEnum(NormalBalance)
  @IsNotEmpty()
  normalBalance: NormalBalance; // Umumnya DEBIT untuk piutang
}
