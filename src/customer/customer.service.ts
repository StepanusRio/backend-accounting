import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { Customer } from 'generated/prisma';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) { }

  async create(createCustomerDto: CreateCustomerDto): Promise<Customer> {
    try {
      return this.prisma.customer.create({
        data: createCustomerDto,
      });
    } catch (error) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new BadRequestException(`Customer with code '${createCustomerDto.customerCode}' already exists.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<Customer[]> {
    return this.prisma.customer.findMany();
  }

  async findOne(id: number): Promise<Customer> {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
    });
    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found.`);
    }
    return customer;
  }

  async update(id: number, updateCustomerDto: UpdateCustomerDto): Promise<Customer> {
    try {
      const updatedCustomer = await this.prisma.customer.update({
        where: { id },
        data: updateCustomerDto,
      });
      return updatedCustomer;
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Customer with ID ${id} not found.`);
      }
      if (error.code === 'P2002' && updateCustomerDto.customerCode) { // Unique constraint for code
        throw new BadRequestException(`Customer with code '${updateCustomerDto.customerCode}' already exists.`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Customer> {
    try {
      return await this.prisma.customer.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Customer with ID ${id} not found.`);
      }
      // TODO: Handle P2003 (Foreign key constraint failed) if customer is linked to journal items
      throw error;
    }
  }
}
