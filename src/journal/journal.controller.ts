// src/journal/journal.controller.ts
import { Controller, Get, Post, Body, Patch, Param, Delete, HttpCode, HttpStatus, UsePipes, ValidationPipe, Req, BadRequestException, UseGuards } from '@nestjs/common';
import { JournalService } from './journal.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';
import { JournalStatus, UserRole } from 'generated/prisma';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('journals')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class JournalController {
  constructor(private readonly journalService: JournalService) { }

  @Post()
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN) // Contoh: STAFF bisa buat jurnal
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createJournalDto: CreateJournalDto, @Req() req: any) {
    const userId = req.user.id; // Ambil ID user asli dari token
    return this.journalService.create(createJournalDto, userId);
  }

  @Get()
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN) // Semua bisa melihat
  findAll() {
    return this.journalService.findAll();
  }

  @Get(':id')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  findOne(@Param('id') id: string) {
    return this.journalService.findOne(+id);
  }

  @Patch(':id')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN) // Staff bisa edit draft, manager bisa approve/reject
  update(@Param('id') id: string, @Body() updateJournalDto: UpdateJournalDto, @Req() req: any) {
    const userId = req.user.id; // Ambil ID user asli dari token
    return this.journalService.update(+id, updateJournalDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.STAFF, UserRole.ADMIN) // Hanya staff/admin yang bisa hapus (draft/rejected)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.journalService.remove(+id);
  }

  @Patch(':id/status')
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.STAFF) // Hanya manajer/admin yang bisa mengubah status
  updateStatus(@Param('id') id: string, @Body('status') status: JournalStatus, @Req() req: any) {
    if (!status || !Object.values(JournalStatus).includes(status)) {
      throw new BadRequestException('Invalid journal status provided.');
    }
    const userId = req.user.id; // Ambil ID user asli dari token
    return this.journalService.updateJournalStatus(+id, status, userId);
  }
}