import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { AccountService } from './account.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Controller('accounts')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true })) // Aktifkan validasi global untuk controller ini

export class AccountController {
  constructor(private readonly accountService: AccountService) { }

  @Post()
  @HttpCode(HttpStatus.CREATED) // Mengatur status kode 201 untuk POST
  create(@Body() createAccountDto: CreateAccountDto) {
    return this.accountService.create(createAccountDto);
  }

  @Get()
  findAll() {
    return this.accountService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.accountService.findOne(+id); // (+) mengubah string id menjadi number
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAccountDto: UpdateAccountDto) {
    return this.accountService.update(+id, updateAccountDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT) // Mengatur status kode 204 untuk DELETE berhasil tanpa konten
  remove(@Param('id') id: string) {
    return this.accountService.remove(+id);
  }

}
