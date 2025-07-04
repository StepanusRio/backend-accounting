// src/vendor/dto/create-vendor.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { NormalBalance } from 'generated/prisma';

export class CreateVendorDto {
  @IsString()
  @IsNotEmpty()
  vendorCode: string;

  @IsString()
  @IsNotEmpty()
  vendorName: string;

  @IsNumber({}, { message: 'openingBalance must be a valid number' })
  @Transform(({ value }) => parseFloat(value))
  @IsOptional()
  openingBalance?: number;

  @IsEnum(NormalBalance)
  @IsNotEmpty()
  normalBalance: NormalBalance; // Umumnya KREDIT untuk utang
}