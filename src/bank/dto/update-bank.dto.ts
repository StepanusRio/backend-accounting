// src/bank/dto/update-bank.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateBankDto } from './create-bank.dto';

export class UpdateBankDto extends PartialType(CreateBankDto) { }