// src/journal/dto/update-journal.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateJournalDto } from './create-journal.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { JournalStatus } from 'generated/prisma';

export class UpdateJournalDto extends PartialType(CreateJournalDto) {
  @IsEnum(JournalStatus)
  @IsOptional()
  status?: JournalStatus; // Untuk mengupdate status jurnal (misal dari SUBMITTED ke APPROVED)
}