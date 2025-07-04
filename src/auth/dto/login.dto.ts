// src/auth/dto/login.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string; // Atau email, tergantung bagaimana Anda ingin user login

  @IsString()
  @IsNotEmpty()
  password: string;
}