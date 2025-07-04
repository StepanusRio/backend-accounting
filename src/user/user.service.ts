// src/user/user.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcryptjs';
import { User } from 'generated/prisma';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) { }

  async create(createUserDto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const { password, ...userData } = createUserDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { username: userData.username },
    });
    if (existingUser) {
      throw new BadRequestException('Username already taken.');
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });
    if (existingEmail) {
      throw new BadRequestException('Email already in use.');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        ...userData,
        passwordHash: hashedPassword,
      },
    });

    // Hapus passwordHash sebelum mengembalikan objek user
    const { passwordHash, ...result } = newUser;
    return result;
  }

  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return users;
  }

  async findOne(id: number): Promise<Omit<User, 'passwordHash'>> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    return user;
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<Omit<User, 'passwordHash'>> {
    const { password, ...userData } = updateUserDto;
    const updateData: any = { ...userData };

    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return updatedUser;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      if (error.code === 'P2002') { // Handle unique constraint violations
        if (error.meta.target.includes('username')) {
          throw new BadRequestException('Username already taken.');
        }
        if (error.meta.target.includes('email')) {
          throw new BadRequestException('Email already in use.');
        }
      }
      throw error;
    }
  }

  async remove(id: number): Promise<Omit<User, 'passwordHash'>> {
    try {
      const deletedUser = await this.prisma.user.delete({
        where: { id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return deletedUser;
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`User with ID ${id} not found.`);
      }
      throw error;
    }
  }
}