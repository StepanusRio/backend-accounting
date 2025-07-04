// src/report/report.module.ts
import { Module } from '@nestjs/common';
import { ReportService } from './report.service';
import { ReportController } from './report.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AccountModule } from '../account/account.module';
import { CustomerModule } from '../customer/customer.module';
import { VendorModule } from '../vendor/vendor.module';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [
    PrismaModule,
    AccountModule,
    CustomerModule,
    VendorModule,
    BankModule
  ],
  controllers: [ReportController],
  providers: [ReportService],
  exports: [ReportService] // Jika nanti modul lain (misal Neraca Lajur) perlu menggunakan ReportService
})
export class ReportModule { }