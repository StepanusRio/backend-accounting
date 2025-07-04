// src/journal/dto/create-journal-item.dto.ts
import { IsInt, IsOptional, IsNumber, IsDecimal, ValidateIf, IsDefined } from 'class-validator';
import { Transform } from 'class-transformer';

// Custom validator function (sama seperti yang kita diskusikan sebelumnya)
// Pastikan hanya satu dari helperId yang terisi, atau tidak sama sekali
function checkOneHelperIdAtMost(object: CreateJournalItemDto) {
  const helperIds = [object.customerId, object.vendorId, object.bankId].filter(id => id !== undefined && id !== null);
  return helperIds.length <= 1;
}

export class CreateJournalItemDto {
  @IsInt()
  @IsDefined() // Pastikan accountId ada
  accountId: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  debit: number;

  @IsNumber()
  @Transform(({ value }) => parseFloat(value))
  credit: number;

  @IsOptional()
  @IsInt()
  @ValidateIf(checkOneHelperIdAtMost) // Menerapkan validasi custom
  customerId?: number;

  @IsOptional()
  @IsInt()
  @ValidateIf(checkOneHelperIdAtMost) // Menerapkan validasi custom
  vendorId?: number;

  @IsOptional()
  @IsInt()
  @ValidateIf(checkOneHelperIdAtMost) // Menerapkan validasi custom
  bankId?: number;
}