// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module'; // Import UserModule
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Untuk konfigurasi JWT_SECRET
import { JwtStrategy } from './strategies/jwt.strategy';
import { AuthController } from './auth.controller'; // Akan kita buat di langkah berikutnya
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    UserModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule], // Penting: import ConfigModule di sini
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Pastikan ini mengambil secret dari .env
        signOptions: { expiresIn: '1h' }, // Token berlaku 1 jam. Sesuaikan jika perlu.
      }),
      inject: [ConfigService], // Penting: inject ConfigService
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, PrismaService],
  exports: [AuthService, JwtModule], // Ekspor JwtModule agar bisa digunakan di modul lain (misal JournalModule)
})
export class AuthModule { }