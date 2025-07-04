// src/report/dto/get-general-ledger.dto.ts
import { IsInt, Min, Max, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class GetGeneralLedgerDto {
  @IsInt()
  @Type(() => Number) // Penting untuk mengubah string dari query param menjadi number
  @IsNotEmpty()
  accountId: number;

  @IsInt()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  @IsNotEmpty()
  month: number;

  @IsInt()
  @Min(1900) // Sesuaikan dengan rentang tahun bisnis Anda
  @Type(() => Number)
  @IsNotEmpty()
  year: number;
}