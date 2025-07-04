// src/report/dto/get-subsidiary-ledger.dto.ts
import { IsInt, Min, Max, IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class GetSubsidiaryLedgerDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional() // Salah satu dari ini harus ada
  customerId?: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional() // Salah satu dari ini harus ada
  vendorId?: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  @IsOptional() // Salah satu dari ini harus ada
  bankId?: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  @IsNotEmpty()
  month: number;

  @IsInt()
  @Min(1900)
  @Type(() => Number)
  @IsNotEmpty()
  year: number;
}