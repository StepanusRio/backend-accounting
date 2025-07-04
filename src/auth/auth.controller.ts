// src/auth/auth.controller.ts
import { Controller, Post, Body, HttpCode, HttpStatus, UseGuards, Request, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CreateUserDto } from '../user/dto/create-user.dto'; // Untuk registrasi
import { UserService } from '../user/user.service'; // Untuk registrasi
import { JwtAuthGuard } from './guards/jwt-auth.guard'; // Untuk profil

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private userService: UserService // Untuk registrasi
  ) { }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() createUserDto: CreateUserDto) {
    // Anda mungkin ingin membatasi role yang bisa diregister di sini
    // Misalnya, hanya bisa register sebagai STAFF, atau hanya admin yang bisa membuat user baru
    return this.userService.create(createUserDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard) // Lindungi endpoint ini, hanya user terautentikasi yang bisa akses
  @Get('profile')
  getProfile(@Request() req: any) {
    // req.user akan berisi payload dari JWT setelah diverifikasi oleh JwtStrategy
    return req.user;
  }
}