// src/user/dto/create-user.dto.ts
import { IsString, IsNotEmpty, IsEmail, MinLength, IsEnum } from 'class-validator';
import { UserRole } from 'generated/prisma';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  password: string; // Password plain-text dari input

  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole; // ADMIN, MANAGER, STAFF
}