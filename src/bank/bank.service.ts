// src/bank/bank.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBankDto } from './dto/create-bank.dto';
import { UpdateBankDto } from './dto/update-bank.dto';
import { Bank } from 'generated/prisma';

@Injectable()
export class BankService {
  constructor(private prisma: PrismaService) { }

  async create(createBankDto: CreateBankDto): Promise<Bank> {
    try {
      return this.prisma.bank.create({
        data: createBankDto,
      });
    } catch (error) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new BadRequestException(`Bank with code '${createBankDto.bankCode}' already exists.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<Bank[]> {
    return this.prisma.bank.findMany();
  }

  async findOne(id: number): Promise<Bank> {
    const bank = await this.prisma.bank.findUnique({
      where: { id },
    });
    if (!bank) {
      throw new NotFoundException(`Bank with ID ${id} not found.`);
    }
    return bank;
  }

  async update(id: number, updateBankDto: UpdateBankDto): Promise<Bank> {
    try {
      const updatedBank = await this.prisma.bank.update({
        where: { id },
        data: updateBankDto,
      });
      return updatedBank;
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Bank with ID ${id} not found.`);
      }
      if (error.code === 'P2002' && updateBankDto.bankCode) { // Unique constraint for code
        throw new BadRequestException(`Bank with code '${updateBankDto.bankCode}' already exists.`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Bank> {
    try {
      return await this.prisma.bank.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Bank with ID ${id} not found.`);
      }
      // TODO: Handle P2003 (Foreign key constraint failed) if bank is linked to journal items
      throw error;
    }
  }
}