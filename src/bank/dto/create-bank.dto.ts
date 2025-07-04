// src/bank/dto/create-bank.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { NormalBalance } from 'generated/prisma';

export class CreateBankDto {
  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsOptional()
  accountNumber?: string; // Nomor rekening bank

  @IsNumber({}, { message: 'openingBalance must be a valid number' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  openingBalance?: number;

  @IsEnum(NormalBalance)
  @IsNotEmpty()
  normalBalance: NormalBalance; // Umumnya DEBIT untuk kas bank
}