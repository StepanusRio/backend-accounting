// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config'; // Untuk membaca JWT_SECRET dari .env
import { PrismaService } from '../../prisma/prisma.service'; // Import PrismaService

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService, private prisma: PrismaService) {
    const jwtSecret = configService.get<string>('JWT_SECRET')!;
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret, // Sekarang TypeScript tahu ini adalah 'string'
    });
  }

  async validate(payload: any) {
    // Payload adalah data yang kita masukkan ke token saat login
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) { // Pastikan user ada dan aktif
      throw new UnauthorizedException();
    }
    // Objek yang dikembalikan di sini akan ditambahkan ke `req.user`
    return user;
  }
}