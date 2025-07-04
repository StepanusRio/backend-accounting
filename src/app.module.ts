// src/app.module.ts
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AccountModule } from './account/account.module';
import { CustomerModule } from './customer/customer.module';
import { VendorModule } from './vendor/vendor.module';
import { BankModule } from './bank/bank.module';
import { JournalModule } from './journal/journal.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config'; // Pastikan ini diimpor
import { validationSchema } from './config/configuration'; // Import validationSchema
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Membuat ConfigModule tersedia secara global
      validationSchema: validationSchema, // Tambahkan skema validasi di sini
      validationOptions: {
        allowUnknown: true, // Jangan izinkan variabel lingkungan yang tidak didefinisikan dalam skema
        abortEarly: true,    // Hentikan validasi dan lempar error segera setelah menemukan yang pertama
      },
      // load: [config], // Opsional: jika Anda ingin menggunakan objek konfigurasi yang lebih terstruktur
    }),
    PrismaModule,
    AccountModule,
    CustomerModule,
    VendorModule,
    BankModule,
    JournalModule,
    UserModule,
    AuthModule,
    ReportModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }