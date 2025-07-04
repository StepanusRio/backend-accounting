// src/report/report.controller.ts
import { BadRequestException, Controller, Get, Query, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { ReportService } from './report.service';
import { GetGeneralLedgerDto } from './dto/get-general-ledger.dto';
import { GetSubsidiaryLedgerDto } from './dto/get-subsidiary-ledger.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from 'generated/prisma';
import { GetReportPeriodDto } from './dto/get-report-period.dto';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard) // Semua endpoint laporan dilindungi
@UsePipes(new ValidationPipe({ transform: true, whitelist: true })) // Transform otomatis query string ke DTO
export class ReportController {
  constructor(private readonly reportService: ReportService) { }

  @Get('general-ledger')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN) // Semua yang relevan bisa melihat laporan
  async getGeneralLedger(@Query() query: GetGeneralLedgerDto) {
    const { accountId, month, year } = query;
    return this.reportService.getGeneralLedger(accountId, month, year);
  }

  @Get('subsidiary-ledger')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN) // Semua yang relevan bisa melihat laporan
  async getSubsidiaryLedger(@Query() query: GetSubsidiaryLedgerDto) {
    // Pastikan hanya satu ID pembantu yang diberikan
    const { customerId, vendorId, bankId, month, year } = query;

    const providedIds = [customerId, vendorId, bankId].filter(id => id !== undefined);
    if (providedIds.length !== 1) {
      throw new BadRequestException('Exactly one of customerId, vendorId, or bankId must be provided.');
    }

    return this.reportService.getSubsidiaryLedger(customerId, vendorId, bankId, month, year);
  }

  @Get('trial-balance')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  async getTrialBalance(@Query() query: GetReportPeriodDto) {
    const { month, year } = query;
    return this.reportService.getTrialBalance(month, year);
  }

  @Get('profit-loss')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  async getProfitLoss(@Query() query: GetReportPeriodDto) {
    const { month, year } = query;
    return this.reportService.getProfitLoss(month, year);
  }

  @Get('balance-sheet')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  async getBalanceSheet(@Query() query: GetReportPeriodDto) {
    const { month, year } = query;
    return this.reportService.getBalanceSheet(month, year);
  }

  @Get('changes-in-equity')
  @Roles(UserRole.STAFF, UserRole.MANAGER, UserRole.ADMIN)
  async getChangesInEquity(@Query() query: GetReportPeriodDto) {
    const { month, year } = query;
    return this.reportService.getChangesInEquity(month, year);
  }
}