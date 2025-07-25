import { Module } from '@nestjs/common';
import { AccountController } from './account.controller';
import { AccountService } from './account.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AccountController],
  providers: [AccountService],
  exports: [AccountService] // Optionals Ussed If AccountModule is Used by other moddule
})
export class AccountModule { }
