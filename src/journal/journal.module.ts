import { Module } from '@nestjs/common';
import { JournalController } from './journal.controller';
import { JournalService } from './journal.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AccountModule } from 'src/account/account.module';
import { CustomerModule } from 'src/customer/customer.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { BankModule } from 'src/bank/bank.module';

@Module({
  imports: [
    PrismaModule,
    AccountModule,    // Dibutuhkan oleh JournalService
    CustomerModule,   // Dibutuhkan oleh JournalService
    VendorModule,     // Dibutuhkan oleh JournalService
    BankModule        // Dibutuhkan oleh JournalService
  ],
  controllers: [JournalController],
  providers: [JournalService],
  exports: [JournalService] // Mungkin akan diekspor jika ada modul lain yang membutuhkan (misalnya modul Laporan)
})
export class JournalModule { }
