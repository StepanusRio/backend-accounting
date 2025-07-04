import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateVendorDto } from './dto/create-vendor.dto';
import { Vendor } from 'generated/prisma';
import { UpdateVendorDto } from './dto/update-vendor.dto';

@Injectable()
export class VendorService {
  constructor(private prisma: PrismaService) { }

  async create(createVendorDto: CreateVendorDto): Promise<Vendor> {
    try {
      return this.prisma.vendor.create({
        data: createVendorDto,
      });
    } catch (error) {
      if (error.code === 'P2002') { // Unique constraint violation
        throw new BadRequestException(`Vendor with code '${createVendorDto.vendorCode}' already exists.`);
      }
      throw error;
    }
  }

  async findAll(): Promise<Vendor[]> {
    return this.prisma.vendor.findMany();
  }

  async findOne(id: number): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
    });
    if (!vendor) {
      throw new NotFoundException(`Vendor with ID ${id} not found.`);
    }
    return vendor;
  }

  async update(id: number, updateVendorDto: UpdateVendorDto): Promise<Vendor> {
    try {
      const updatedVendor = await this.prisma.vendor.update({
        where: { id },
        data: updateVendorDto,
      });
      return updatedVendor;
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Vendor with ID ${id} not found.`);
      }
      if (error.code === 'P2002' && updateVendorDto.vendorCode) { // Unique constraint for code
        throw new BadRequestException(`Vendor with code '${updateVendorDto.vendorCode}' already exists.`);
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Vendor> {
    try {
      return await this.prisma.vendor.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') { // Record not found
        throw new NotFoundException(`Vendor with ID ${id} not found.`);
      }
      // TODO: Handle P2003 (Foreign key constraint failed) if vendor is linked to journal items
      throw error;
    }
  }
}
