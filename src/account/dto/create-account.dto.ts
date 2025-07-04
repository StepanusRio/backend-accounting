/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// src/account/dto/create-account.dto.ts
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Matches } from 'class-validator';
import { HelperType, NormalBalance, ReportPosition } from 'generated/prisma';

export class CreateAccountDto {
	@IsString()
	@IsNotEmpty()
	@Matches(/^[0-9-]+$/, { message: 'Account code must contain only numbers and hyphens' }) // Contoh: 111-01
	accountCode: string;

	@IsString()
	@IsNotEmpty()
	accountName: string;

	@IsEnum(NormalBalance)
	normalBalance: NormalBalance; // DEBIT atau KREDIT

	@IsEnum(ReportPosition)
	reportPosition: ReportPosition; // NERACA atau LABA_RUGI

	@IsNumber({}, { message: 'openingBalance must be a valid number' })
	@Transform(({ value }) => parseFloat(value)) // Pastikan string diubah jadi float/number
	@IsOptional() // Saldo awal bisa opsional saat pembuatan
	openingBalance?: number;

	@IsBoolean()
	@IsOptional()
	needsHelper?: boolean; // Menunjukkan apakah akun ini membutuhkan tabel bantu

	@IsEnum(HelperType)
	@IsOptional()
	// helperType hanya relevan jika needsHelper true
	// Di sini, kita asumsikan jika needsHelper true, helperType harus ada. Validasi lebih lanjut di service.
	helperType?: HelperType;
}
