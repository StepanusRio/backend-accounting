// src/journal/dto/create-journal.dto.ts
import { IsDateString, IsNotEmpty, IsString, IsArray, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateJournalItemDto } from './create-journal-item.dto';

export class CreateJournalDto {
  @IsDateString()
  transactionDate: string; // Akan diubah ke Date di service

  @IsString()
  @IsNotEmpty()
  voucherNumber: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'A journal entry must have at least two items (one debit, one credit).' })
  @ValidateNested({ each: true }) // Validasi setiap item di dalam array
  @Type(() => CreateJournalItemDto) // Penting untuk transformasi ke instance DTO
  items: CreateJournalItemDto[];
}