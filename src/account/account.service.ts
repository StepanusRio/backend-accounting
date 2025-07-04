import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account, HelperType } from 'generated/prisma';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountService {
	constructor(private prisma: PrismaService) { }

	// --- Create ---
	async create(createAccountDto: CreateAccountDto): Promise<Account> {
		const { needsHelper, helperType, ...accountData } = createAccountDto

		// Validasi: Jika needsHelper true, maka helperType harus disediakan
		if (needsHelper && !helperType) {
			throw new BadRequestException('Helper type is required if needsHelper is true.');
		}
		// Validasi: Jika needsHelper false, maka helperType tidak boleh ada
		if (!needsHelper && helperType) {
			throw new BadRequestException('Helper type should not be provided if needsHelper is false.');
		}

		try {
			return this.prisma.account.create({
				data: {
					...accountData,
					needsHelper: needsHelper || false, // Default to false if not provided
					helperType: needsHelper ? helperType : null
				}
			})
		} catch (error) {
			// Menangkap error jika accountCode sudah ada
			if (error.code === 'P2002') { // P2002 adalah kode error Prisma untuk unique constraint violation
				throw new BadRequestException(`Account with code '${createAccountDto.accountCode}' already exists.`);
			}
			throw error; // Lempar error lain jika ada
		}
	}

	// --- READ ALL ---
	async findAll(): Promise<Account[]> {
		return this.prisma.account.findMany();
	}

	// --- READ ONE ---
	async findOne(id: number): Promise<Account> {
		const account = await this.prisma.account.findUnique({
			where: { id },
		});
		if (!account) {
			throw new NotFoundException(`Account with ID ${id} not found.`);
		}
		return account;
	}

	// --- UPDATE ---
	async update(id: number, updateAccountDto: UpdateAccountDto): Promise<Account> {
		const { needsHelper, helperType, ...accountData } = updateAccountDto;

		// Validasi: Jika needsHelper true, maka helperType harus disediakan
		if (needsHelper !== undefined && needsHelper && !helperType) {
			throw new BadRequestException('Helper type is required if needsHelper is true.');
		}
		// Validasi: Jika needsHelper false, maka helperType tidak boleh ada
		if (needsHelper !== undefined && !needsHelper && helperType) {
			throw new BadRequestException('Helper type should not be provided if needsHelper is false.');
		}

		try {
			const updatedAccount = await this.prisma.account.update({
				where: { id },
				data: {
					...accountData,
					needsHelper: needsHelper !== undefined ? needsHelper : undefined, // Update only if provided
					helperType: needsHelper === true ? helperType : (needsHelper === false ? null : undefined), // Set to null if needsHelper becomes false
				},
			});
			return updatedAccount;
		} catch (error) {
			if (error.code === 'P2025') { // P2025: Record not found
				throw new NotFoundException(`Account with ID ${id} not found.`);
			}
			if (error.code === 'P2002' && updateAccountDto.accountCode) { // Jika accountCode diupdate ke yang sudah ada
				throw new BadRequestException(`Account with code '${updateAccountDto.accountCode}' already exists.`);
			}
			throw error;
		}
	}

	// --- DELETE ---
	async remove(id: number): Promise<Account> {
		try {
			return await this.prisma.account.delete({
				where: { id },
			});
		} catch (error) {
			if (error.code === 'P2025') { // P2025: Record not found
				throw new NotFoundException(`Account with ID ${id} not found.`);
			}
			// TODO: Pertimbangkan penanganan error P2003 (Foreign key constraint failed)
			// Jika akun ini masih digunakan di journal_items, Anda tidak boleh menghapusnya.
			// Anda bisa memberikan pesan error yang lebih informatif atau melakukan 'soft delete'
			throw error;
		}
	}

	// Fungsi bantu untuk mendapatkan HelperType berdasarkan enum string
	async getHelperTypeEnum(type: string): Promise<HelperType> {
		const enumValue = HelperType[type.toUpperCase() as keyof typeof HelperType];
		if (!enumValue) {
			throw new BadRequestException(`Invalid helper type: ${type}`);
		}
		return enumValue;
	}

}
