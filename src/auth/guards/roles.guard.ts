// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../roles.decorator';
import { UserRole } from 'generated/prisma';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) { }

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true; // Jika tidak ada roles yang diset, izinkan akses
    }
    const { user } = context.switchToHttp().getRequest(); // Mendapatkan user dari req.user (hasil dari JwtStrategy)

    // Memastikan user ada dan memiliki salah satu peran yang dibutuhkan
    return user && requiredRoles.some((role) => user.role === role);
  }
}