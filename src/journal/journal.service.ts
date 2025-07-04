import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { JournalEntry, JournalStatus } from 'generated/prisma';
import { AccountService } from 'src/account/account.service';
import { BankService } from 'src/bank/bank.service';
import { CustomerService } from 'src/customer/customer.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { VendorService } from 'src/vendor/vendor.service';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

@Injectable()
export class JournalService {
  constructor(
    private prisma: PrismaService,
    private accountService: AccountService, // Inject AccountService
    private customerService: CustomerService, // Inject CustomerService
    private vendorService: VendorService, // Inject VendorService
    private bankService: BankService, // Inject BankService
  ) { }

  // --- CREATE JOURNAL ENTRY ---
  async create(createJournalDto: CreateJournalDto, userId: number): Promise<JournalEntry> {
    const { items, ...journalData } = createJournalDto;

    // 1. Validasi Total Debit dan Kredit
    const totalDebit = items.reduce((sum, item) => sum + item.debit, 0);
    const totalKredit = items.reduce((sum, item) => sum + item.credit, 0);

    if (totalDebit !== totalKredit) {
      throw new BadRequestException('Total Debit must be equal to Total Kredit.');
    }
    if (totalDebit === 0 && totalKredit === 0) {
      throw new BadRequestException('Journal entry cannot have zero total debit and credit.');
    }

    // 2. Validasi Voucher Number Unik
    const existingJournal = await this.prisma.journalEntry.findUnique({
      where: { voucherNumber: journalData.voucherNumber },
    });
    if (existingJournal) {
      throw new BadRequestException(`Voucher number '${journalData.voucherNumber}' already exists.`);
    }

    // 3. Validasi Akun dan Akun Bantu untuk Setiap Item Jurnal
    for (const item of items) {
      const account = await this.accountService.findOne(item.accountId); // Menggunakan findOne dari AccountService

      // Pastikan akun memang membutuhkan helper jika helperId disediakan
      if (account.needsHelper) {
        if (!item.customerId && !item.vendorId && !item.bankId) {
          throw new BadRequestException(`Account '${account.accountName}' (ID: ${account.id}) requires a helper.`);
        }
        if (account.helperType === 'CUSTOMER' && !item.customerId) {
          throw new BadRequestException(`Account '${account.accountName}' requires a Customer ID.`);
        }
        if (account.helperType === 'VENDOR' && !item.vendorId) {
          throw new BadRequestException(`Account '${account.accountName}' requires a Vendor ID.`);
        }
        if (account.helperType === 'BANK' && !item.bankId) {
          throw new BadRequestException(`Account '${account.accountName}' requires a Bank ID.`);
        }
      } else {
        // Jika akun tidak membutuhkan helper, pastikan tidak ada helperId yang dikirim
        if (item.customerId || item.vendorId || item.bankId) {
          throw new BadRequestException(`Account '${account.accountName}' (ID: ${account.id}) does not require a helper.`);
        }
      }

      // Validasi keberadaan helper ID jika disediakan
      if (item.customerId) { await this.customerService.findOne(item.customerId); }
      if (item.vendorId) { await this.vendorService.findOne(item.vendorId); }
      if (item.bankId) { await this.bankService.findOne(item.bankId); }
    }

    // 4. Buat Transaksi Jurnal
    return this.prisma.$transaction(async (prisma) => {
      const newJournalEntry = await prisma.journalEntry.create({
        data: {
          ...journalData,
          transactionDate: new Date(journalData.transactionDate), // Konversi string ke Date
          createdByUserId: userId, // Catat user yang membuat
          status: JournalStatus.DRAFT, // Status awal DRAFT
          journalItems: {
            createMany: {
              data: items,
            },
          },
        },
      });
      return newJournalEntry;
    });
  }

  // --- GET ALL JOURNAL ENTRIES (with optional filtering/pagination) ---
  async findAll(): Promise<JournalEntry[]> {
    return this.prisma.journalEntry.findMany({
      include: {
        journalItems: {
          include: {
            account: true, // Sertakan detail akun
            customer: true, // Sertakan detail customer jika ada
            vendor: true, // Sertakan detail vendor jika ada
            bank: true, // Sertakan detail bank jika ada
          },
        },
        createdBy: {
          select: { username: true } // Hanya username dari user pembuat
        },
        staffApprovedBy: {
          select: { username: true }
        },
        managerApprovedBy: {
          select: { username: true }
        }
      },
      orderBy: {
        transactionDate: 'desc' // Urutkan terbaru dulu
      }
    });
  }

  // --- GET ONE JOURNAL ENTRY ---
  async findOne(id: number): Promise<JournalEntry> {
    const journalEntry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: {
        journalItems: {
          include: {
            account: true,
            customer: true,
            vendor: true,
            bank: true,
          },
        },
        createdBy: { select: { username: true } },
        staffApprovedBy: { select: { username: true } },
        managerApprovedBy: { select: { username: true } }
      },
    });
    if (!journalEntry) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found.`);
    }
    return journalEntry;
  }

  // --- UPDATE JOURNAL ENTRY ---
  // Ini bisa untuk edit draft atau update status (approval)
  async update(id: number, updateJournalDto: UpdateJournalDto, userId: number): Promise<JournalEntry> {
    const existingJournal = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { journalItems: true },
    });

    if (!existingJournal) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found.`);
    }

    // Validasi status untuk update:
    // Hanya DRAFT yang bisa diubah isinya
    if (existingJournal.status !== JournalStatus.DRAFT && (updateJournalDto.items || updateJournalDto.transactionDate || updateJournalDto.description || updateJournalDto.voucherNumber)) {
      throw new BadRequestException(`Cannot modify approved or submitted journal entries.`);
    }

    // Handle update status (approval flow)
    if (updateJournalDto.status) {
      // Logic untuk approval/submission
      if (updateJournalDto.status === JournalStatus.SUBMITTED && existingJournal.status === JournalStatus.DRAFT) {
        // Asumsi user yang submit adalah user yang login
        return this.prisma.journalEntry.update({
          where: { id },
          data: {
            status: JournalStatus.SUBMITTED,
            submittedAt: new Date(),
            // staffApprovedByUserId: userId, // Jika ada tahap approval oleh staff
            // staffApprovedAt: new Date()
          }
        });
      } else if (updateJournalDto.status === JournalStatus.APPROVED && existingJournal.status === JournalStatus.SUBMITTED) {
        // Asumsi user yang approve adalah manajer (ini akan divalidasi di controller dengan Guard)
        return this.prisma.journalEntry.update({
          where: { id },
          data: {
            status: JournalStatus.APPROVED,
            managerApprovedByUserId: userId, // Catat manager yang approve
            managerApprovedAt: new Date()
          }
        });
      } else if (updateJournalDto.status === JournalStatus.REJECTED && existingJournal.status === JournalStatus.SUBMITTED) {
        // Asumsi user yang menolak adalah manajer
        return this.prisma.journalEntry.update({
          where: { id },
          data: {
            status: JournalStatus.REJECTED,
            managerApprovedByUserId: userId, // Catat manager yang menolak
            managerApprovedAt: new Date()
          }
        });
      } else {
        throw new BadRequestException(`Invalid status transition from ${existingJournal.status} to ${updateJournalDto.status}.`);
      }
    }

    // Handle update content (hanya jika status DRAFT)
    if (updateJournalDto.items && updateJournalDto.items.length > 0) {
      const totalDebit = updateJournalDto.items.reduce((sum, item) => sum + item.debit, 0);
      const totalKredit = updateJournalDto.items.reduce((sum, item) => sum + item.credit, 0);

      if (totalDebit !== totalKredit) {
        throw new BadRequestException('Updated total Debit must be equal to Total Kredit.');
      }

      // Hapus item lama dan buat yang baru, atau update item yang ada
      return this.prisma.$transaction(async (prisma) => {
        await prisma.journalItem.deleteMany({
          where: { journalEntryId: id },
        });

        const updatedJournal = await prisma.journalEntry.update({
          where: { id },
          data: {
            ...updateJournalDto,
            transactionDate: updateJournalDto.transactionDate ? new Date(updateJournalDto.transactionDate) : undefined,
            journalItems: {
              createMany: {
                data: updateJournalDto.items!,
              },
            },
          },
          include: { journalItems: true }, // Sertakan item yang baru dibuat dalam respons
        });
        return updatedJournal;
      });
    }

    // Jika hanya data header yang diupdate (e.g. description)
    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        ...updateJournalDto,
        transactionDate: updateJournalDto.transactionDate ? new Date(updateJournalDto.transactionDate) : undefined,
      },
    });
  }

  // --- DELETE JOURNAL ENTRY ---
  async remove(id: number): Promise<JournalEntry> {
    const existingJournal = await this.prisma.journalEntry.findUnique({ where: { id } });

    if (!existingJournal) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found.`);
    }

    // Hanya DRAFT atau REJECTED yang bisa dihapus
    if (existingJournal.status === JournalStatus.APPROVED || existingJournal.status === JournalStatus.SUBMITTED) {
      throw new BadRequestException(`Cannot delete approved or submitted journal entries.`);
    }

    try {
      return await this.prisma.journalEntry.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Journal Entry with ID ${id} not found.`);
      }
      throw error;
    }
  }

  // Fungsi tambahan untuk mengubah status jurnal
  async updateJournalStatus(id: number, status: JournalStatus, userId: number): Promise<JournalEntry> {
    const existingJournal = await this.prisma.journalEntry.findUnique({ where: { id } });

    if (!existingJournal) {
      throw new NotFoundException(`Journal Entry with ID ${id} not found.`);
    }

    let updateData: any = { status };

    if (status === JournalStatus.SUBMITTED && existingJournal.status === JournalStatus.DRAFT) {
      updateData.submittedAt = new Date();
    } else if (status === JournalStatus.APPROVED && existingJournal.status === JournalStatus.SUBMITTED) {
      updateData.managerApprovedByUserId = userId;
      updateData.managerApprovedAt = new Date();
    } else if (status === JournalStatus.REJECTED && existingJournal.status === JournalStatus.SUBMITTED) {
      updateData.managerApprovedByUserId = userId;
      updateData.managerApprovedAt = new Date();
    } else {
      throw new BadRequestException(`Invalid status transition from ${existingJournal.status} to ${status}.`);
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: updateData,
    });
  }
}
