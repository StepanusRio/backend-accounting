// src/account/dto/update-account.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateAccountDto } from './create-account.dto';

// Semua properti dari CreateAccountDto akan menjadi opsional di sini
export class UpdateAccountDto extends PartialType(CreateAccountDto) { }
