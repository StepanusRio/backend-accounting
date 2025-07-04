// src/report/report.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Customer, Vendor, Bank, NormalBalance, ReportPosition } from 'generated/prisma';
import { AccountService } from '../account/account.service'; // Diperlukan untuk detail akun
import { CustomerService } from '../customer/customer.service';
import { VendorService } from '../vendor/vendor.service';
import { BankService } from '../bank/bank.service';

// Interface untuk output laporan Buku Besar
export interface GeneralLedgerEntry {
  transactionDate: Date;
  voucherNumber: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  accountName?: string; // Hanya untuk kelengkapan
  accountCode?: string; // Hanya untuk kelengkapan
}

// Interface untuk output laporan Buku Pembantu
export interface SubsidiaryLedgerEntry {
  transactionDate: Date;
  voucherNumber: string;
  description: string;
  accountName: string; // Akun pengendali (e.g., Piutang Usaha) atau akun lawan
  debit: number;
  credit: number;
  balance: number;
  // Detail entitas bantu
  customerName?: string;
  vendorName?: string;
  bankName?: string;
}

// Interface baru untuk Neraca Lajur
export interface TrialBalanceEntry {
  accountId: number;
  accountCode: string;
  accountName: string;
  normalBalance: NormalBalance;
  reportPosition: ReportPosition;
  debitBalance: number;
  creditBalance: number;
}

// Interface baru untuk Laporan Laba Rugi
export interface ProfitLossReport {
  revenues: { accountCode: string; accountName: string; balance: number }[];
  expenses: { accountCode: string; accountName: string; balance: number }[];
  totalRevenue: number;
  totalExpense: number;
  netProfitLoss: number;
  startDate: Date;
  endDate: Date;
}

// Interface baru untuk Laporan Neraca
export interface BalanceSheetReport {
  assets: { accountCode: string; accountName: string; balance: number }[];
  liabilities: { accountCode: string; accountName: string; balance: number }[];
  equity: { accountCode: string; accountName: string; balance: number }[];
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  asOfDate: Date;
}

// Interface baru untuk Laporan Perubahan Modal
export interface ChangesInEquityReport {
  openingCapital: number;
  netProfitLoss: number;
  drawings: number; // Prive/Dividen
  endingCapital: number;
  startDate: Date;
  endDate: Date;
}

@Injectable()
export class ReportService {
  constructor(
    private prisma: PrismaService,
    private accountService: AccountService,
    private customerService: CustomerService,
    private vendorService: VendorService,
    private bankService: BankService,
  ) { }

  // --- FUNGSI BANTU: Menghitung Saldo Akun Sampai Tanggal Tertentu ---
  // Ini adalah versi general dari calculatePeriodOpeningBalance untuk satu akun.
  // Akan digunakan untuk Neraca Lajur, Neraca, Laba Rugi.
  private async getAccountBalanceAtDate(
    accountId: number,
    endDate: Date
  ): Promise<number> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { openingBalance: true, normalBalance: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    const initialOpeningBalanceValue = parseFloat(account.openingBalance as any) || 0;

    const transactionsAffectingBalance = await this.prisma.journalItem.findMany({
      where: {
        accountId: accountId,
        journalEntry: {
          transactionDate: { lte: endDate }, // Transaksi hingga tanggal akhir
          status: 'APPROVED', // Hanya jurnal yang disetujui
        },
      },
      select: { debit: true, credit: true },
    });

    let balance = initialOpeningBalanceValue;
    for (const item of transactionsAffectingBalance) {
      const debit = parseFloat(item.debit as any);
      const credit = parseFloat(item.credit as any);

      if (account.normalBalance === NormalBalance.DEBIT) {
        balance += debit - credit;
      } else { // NormalBalance.KREDIT
        balance += credit - debit;
      }
    }
    return balance;
  }

  // --- FUNGSI BANTU: Mengambil Saldo Awal Periode (sudah ada, kita akan panggil) ---
  // Pastikan fungsi calculatePeriodOpeningBalance sudah diperbarui seperti yang terakhir saya rekomendasikan

  // --- FUNGSI BANTU: Menghitung Saldo Awal Periode ---
  private async calculatePeriodOpeningBalance(
    entityType: 'account' | 'customer' | 'vendor' | 'bank',
    entityId: number,
    startDate: Date,
    initialOpeningBalance: number, // Saldo awal dari master data
    normalBalance: NormalBalance
  ): Promise<number> {
    let whereClause: any = {
      journalEntry: {
        transactionDate: { lt: startDate }, // Transaksi sebelum periode yang diminta
        status: 'APPROVED', // Hanya jurnal yang disetujui yang mempengaruhi saldo
      },
    };

    if (entityType === 'account') {
      whereClause.accountId = entityId;
    } else if (entityType === 'customer') {
      whereClause.customerId = entityId;
    } else if (entityType === 'vendor') {
      whereClause.vendorId = entityId;
    } else if (entityType === 'bank') {
      whereClause.bankId = entityId;
    }

    const previousTransactions = await this.prisma.journalItem.findMany({
      where: whereClause,
      select: { debit: true, credit: true },
    });

    let priorPeriodNetChange = 0;
    for (const item of previousTransactions) {
      const debit = parseFloat(item.debit as any);
      const credit = parseFloat(item.credit as any);

      // Mutasi akan meningkatkan atau mengurangi saldo tergantung saldo normal akun
      if (normalBalance === NormalBalance.DEBIT) {
        priorPeriodNetChange += debit - credit;
      } else { // NormalBalance.KREDIT
        priorPeriodNetChange += credit - debit;
      }
    }

    return initialOpeningBalance + priorPeriodNetChange;
  }

  // --- BUKU BESAR (GENERAL LEDGER) ---
  async getGeneralLedger(accountId: number, month: number, year: number): Promise<{
    account: { id: number; accountCode: string; accountName: string; normalBalance: NormalBalance; };
    openingBalance: number;
    transactions: GeneralLedgerEntry[];
  }> {
    const account = await this.prisma.account.findUnique({ where: { id: accountId } });
    if (!account) {
      throw new NotFoundException(`Account with ID ${accountId} not found.`);
    }

    // const startDate = new Date(year, month - 1, 1); // Bulan di JS 0-indexed
    // const endDate = new Date(year, month, 0); // Hari terakhir di bulan

    const startDate = new Date(Date.UTC(year, month - 1, 1)); // Menggunakan Date.UTC
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Akhir hari dalam UTC

    // Hitung saldo awal periode
    const initialOpeningBalanceValue = parseFloat(account.openingBalance as any) || 0;
    let runningBalance = await this.calculatePeriodOpeningBalance(
      'account',
      accountId,
      startDate,
      initialOpeningBalanceValue,
      account.normalBalance
    );

    const journalItems = await this.prisma.journalItem.findMany({
      where: {
        accountId: accountId,
        journalEntry: {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'APPROVED', // Hanya jurnal yang sudah disetujui
        },
      },
      include: {
        journalEntry: {
          select: {
            transactionDate: true,
            voucherNumber: true,
            description: true,
            status: true, // Pastikan status disetujui
          },
        },
      },
      orderBy: [
        { journalEntry: { transactionDate: 'asc' } },
        { id: 'asc' }, // Order by id to ensure consistent running balance for same date
      ],
    });

    const transactions: GeneralLedgerEntry[] = [];
    for (const item of journalItems) {
      const debit = parseFloat(item.debit as any) || 0;
      const credit = parseFloat(item.credit as any) || 0;

      // Update running balance
      if (account.normalBalance === NormalBalance.DEBIT) {
        runningBalance += debit - credit;
      } else { // NormalBalance.KREDIT
        runningBalance += credit - debit;
      }

      transactions.push({
        transactionDate: item.journalEntry.transactionDate,
        voucherNumber: item.journalEntry.voucherNumber,
        description: item.journalEntry.description,
        debit: debit,
        credit: credit,
        balance: runningBalance,
        accountName: account.accountName,
        accountCode: account.accountCode,
      });
    }

    return {
      account: {
        id: account.id,
        accountCode: account.accountCode,
        accountName: account.accountName,
        normalBalance: account.normalBalance,
      },
      openingBalance: runningBalance - transactions.reduce((sum, t) => {
        if (account.normalBalance === NormalBalance.DEBIT) {
          return sum + t.debit - t.credit;
        } else {
          return sum + t.credit - t.debit;
        }
      }, 0), // Saldo awal periode ini
      transactions: transactions,
    };
  }


  // --- BUKU PEMBANTU (SUBSIDIARY LEDGER) ---
  async getSubsidiaryLedger(
    customerId?: number,
    vendorId?: number,
    bankId?: number,
    month?: number,
    year?: number
  ): Promise<{
    entity: { id: number; code: string; name: string; type: 'customer' | 'vendor' | 'bank'; normalBalance: NormalBalance };
    openingBalance: number;
    transactions: SubsidiaryLedgerEntry[];
  }> {
    let entity: Customer | Vendor | Bank | null = null;
    let entityType: 'customer' | 'vendor' | 'bank';
    let whereClause: any;

    if (customerId) {
      entity = await this.prisma.customer.findUnique({ where: { id: customerId } });
      entityType = 'customer';
      whereClause = { customerId: customerId };
      if (!entity) throw new NotFoundException(`Customer with ID ${customerId} not found.`);
    } else if (vendorId) {
      entity = await this.prisma.vendor.findUnique({ where: { id: vendorId } });
      entityType = 'vendor';
      whereClause = { vendorId: vendorId };
      if (!entity) throw new NotFoundException(`Vendor with ID ${vendorId} not found.`);
    } else if (bankId) {
      entity = await this.prisma.bank.findUnique({ where: { id: bankId } });
      entityType = 'bank';
      whereClause = { bankId: bankId };
      if (!entity) throw new NotFoundException(`Bank with ID ${bankId} not found.`);
    } else {
      throw new BadRequestException('One of customerId, vendorId, or bankId must be provided.');
    }

    const startDate = new Date(Date.UTC(year!, month! - 1, 1)); // month! - 1 untuk 0-indexed bulan JavaScript`
    const endDate = new Date(Date.UTC(year!, month!, 0, 23, 59, 59, 999)); // Akhir hari di bulan

    const initialOpeningBalanceValue = parseFloat(entity.openingBalance as any) || 0;
    let runningBalance = await this.calculatePeriodOpeningBalance(
      entityType,
      entity.id,
      startDate,
      initialOpeningBalanceValue,
      entity.normalBalance
    );

    const journalItems = await this.prisma.journalItem.findMany({
      where: {
        ...whereClause,
        journalEntry: {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'APPROVED',
        },
      },
      include: {
        journalEntry: {
          select: {
            transactionDate: true,
            voucherNumber: true,
            description: true,
          },
        },
        account: {
          select: {
            accountCode: true,
            accountName: true,
          },
        },
      },
      orderBy: [
        { journalEntry: { transactionDate: 'asc' } },
        { id: 'asc' },
      ],
    });

    const transactions: SubsidiaryLedgerEntry[] = [];
    for (const item of journalItems) {
      const debit = parseFloat(item.debit as any) || 0;
      const credit = parseFloat(item.credit as any) || 0;

      // Update running balance
      if (entity.normalBalance === NormalBalance.DEBIT) {
        runningBalance += debit - credit;
      } else { // NormalBalance.KREDIT
        runningBalance += credit - debit;
      }

      transactions.push({
        transactionDate: item.journalEntry.transactionDate,
        voucherNumber: item.journalEntry.voucherNumber,
        description: item.journalEntry.description,
        accountName: `${item.account?.accountCode} - ${item.account?.accountName}`, // Akun yang terlibat
        debit: debit,
        credit: credit,
        balance: runningBalance,
        ...(entityType === 'customer' && { customerName: (entity as Customer).customerName }),
        ...(entityType === 'vendor' && { vendorName: (entity as Vendor).vendorName }),
        ...(entityType === 'bank' && { bankName: (entity as Bank).bankName }),
      });
    }

    return {
      entity: {
        id: entity.id,
        code: (entity as any).customerCode || (entity as any).vendorCode || (entity as any).bankCode,
        name: (entity as any).customerName || (entity as any).vendorName || (entity as any).bankName,
        type: entityType,
        normalBalance: entity.normalBalance,
      },
      openingBalance: runningBalance - transactions.reduce((sum, t) => {
        if (entity.normalBalance === NormalBalance.DEBIT) {
          return sum + t.debit - t.credit;
        } else {
          return sum + t.credit - t.debit;
        }
      }, 0), // Saldo awal periode ini
      transactions: transactions,
    };
  }

  // --- NERACA LAJUR (TRIAL BALANCE) ---
  async getTrialBalance(month: number, year: number): Promise<TrialBalanceEntry[]> {
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Akhir hari terakhir bulan

    const allAccounts = await this.prisma.account.findMany({
      select: { id: true, accountCode: true, accountName: true, normalBalance: true, reportPosition: true },
    });

    const trialBalance: TrialBalanceEntry[] = [];
    for (const account of allAccounts) {
      const balance = await this.getAccountBalanceAtDate(account.id, endDate);

      // Tentukan apakah saldo adalah Debit atau Kredit
      let debitBalance = 0;
      let creditBalance = 0;

      if (account.normalBalance === NormalBalance.DEBIT) {
        if (balance >= 0) {
          debitBalance = balance;
        } else {
          creditBalance = Math.abs(balance); // Saldo normal debit tapi hasil akhir kredit
        }
      } else { // NormalBalance.KREDIT
        if (balance >= 0) {
          creditBalance = balance;
        } else {
          debitBalance = Math.abs(balance); // Saldo normal kredit tapi hasil akhir debit
        }
      }

      // Hanya tambahkan akun dengan saldo non-nol (opsional, tapi umumnya begitu di TB)
      if (debitBalance !== 0 || creditBalance !== 0) {
        trialBalance.push({
          accountId: account.id,
          accountCode: account.accountCode,
          accountName: account.accountName,
          normalBalance: account.normalBalance,
          reportPosition: account.reportPosition,
          debitBalance: debitBalance,
          creditBalance: creditBalance,
        });
      }
    }
    // Sortir berdasarkan accountCode
    return trialBalance.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
  }

  // --- LAPORAN LABA RUGI (PROFIT & LOSS STATEMENT) ---
  async getProfitLoss(month: number, year: number): Promise<ProfitLossReport> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // Ambil semua transaksi yang disetujui dalam periode untuk akun laba rugi
    const profitLossItems = await this.prisma.journalItem.findMany({
      where: {
        journalEntry: {
          transactionDate: {
            gte: startDate,
            lte: endDate,
          },
          status: 'APPROVED',
        },
        account: {
          reportPosition: 'LABA_RUGI',
        },
      },
      include: {
        account: {
          select: { accountCode: true, accountName: true, normalBalance: true },
        },
      },
    });

    const revenues: { [key: number]: { accountCode: string; accountName: string; balance: number } } = {};
    const expenses: { [key: number]: { accountCode: string; accountName: string; balance: number } } = {};

    let totalRevenue = 0;
    let totalExpense = 0;

    for (const item of profitLossItems) {
      const debit = parseFloat(item.debit as any) || 0;
      const credit = parseFloat(item.credit as any) || 0;
      const netChange = debit - credit; // Untuk beban, ini akan positif. Untuk pendapatan, negatif.

      if (item.account.normalBalance === NormalBalance.KREDIT) { // Pendapatan (normalnya Kredit)
        if (!revenues[item.accountId]) {
          revenues[item.accountId] = {
            accountCode: item.account.accountCode,
            accountName: item.account.accountName,
            balance: 0,
          };
        }
        revenues[item.accountId].balance += (credit - debit); // Peningkatan pendapatan adalah Kredit, pengurangan adalah Debit
        totalRevenue += (credit - debit);
      } else if (item.account.normalBalance === NormalBalance.DEBIT) { // Beban (normalnya Debit)
        if (!expenses[item.accountId]) {
          expenses[item.accountId] = {
            accountCode: item.account.accountCode,
            accountName: item.account.accountName,
            balance: 0,
          };
        }
        expenses[item.accountId].balance += (debit - credit); // Peningkatan beban adalah Debit, pengurangan adalah Kredit
        totalExpense += (debit - credit);
      }
    }

    const netProfitLoss = totalRevenue - totalExpense;

    return {
      revenues: Object.values(revenues).sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      expenses: Object.values(expenses).sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      totalRevenue: totalRevenue,
      totalExpense: totalExpense,
      netProfitLoss: netProfitLoss,
      startDate: startDate,
      endDate: endDate,
    };
  }

  // --- LAPORAN NERACA (BALANCE SHEET) ---
  async getBalanceSheet(month: number, year: number): Promise<BalanceSheetReport> {
    const asOfDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Akhir hari terakhir bulan

    // Dapatkan semua akun
    const allAccounts = await this.prisma.account.findMany({
      select: { id: true, accountCode: true, accountName: true, normalBalance: true, reportPosition: true },
      where: {
        reportPosition: 'NERACA', // Hanya akun posisi NERACA
      },
    });

    const assets: { [key: number]: { accountCode: string; accountName: string; balance: number } } = {};
    const liabilities: { [key: number]: { accountCode: string; accountName: string; balance: number } } = {};
    const equity: { [key: number]: { accountCode: string; accountName: string; balance: number } } = {};

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    for (const account of allAccounts) {
      const balance = await this.getAccountBalanceAtDate(account.id, asOfDate);

      if (balance !== 0) { // Hanya sertakan akun dengan saldo
        const entry = { accountCode: account.accountCode, accountName: account.accountName, balance: balance };

        if (account.accountCode.startsWith('1')) { // Asumsi: Kode akun Aset dimulai dengan '1'
          assets[account.id] = entry;
          totalAssets += balance;
        } else if (account.accountCode.startsWith('2')) { // Asumsi: Kode akun Kewajiban dimulai dengan '2'
          liabilities[account.id] = entry;
          totalLiabilities += balance;
        } else if (account.accountCode.startsWith('3')) { // Asumsi: Kode akun Modal dimulai dengan '3'
          equity[account.id] = entry;
          totalEquity += balance;
        }
      }
    }

    // Untuk Neraca, total equity harus ditambah Net Profit/Loss dari awal tahun sampai asOfDate
    // Ini bisa kompleks jika Net Profit/Loss sudah dibukukan ke Laba Ditahan.
    // Untuk kesederhanaan awal, kita bisa anggap Laba Rugi periode ini akan mempengaruhi total Equity.
    const profitLossForPeriod = await this.getProfitLoss(month, year); // Laba Rugi untuk bulan yang sama
    totalEquity += profitLossForPeriod.netProfitLoss; // Tambahkan laba/rugi bersih ke ekuitas

    return {
      assets: Object.values(assets).sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      liabilities: Object.values(liabilities).sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      equity: Object.values(equity).sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
      totalAssets: totalAssets,
      totalLiabilities: totalLiabilities,
      totalEquity: totalEquity,
      asOfDate: asOfDate,
    };
  }

  // --- LAPORAN PERUBAHAN MODAL (STATEMENT OF CHANGES IN EQUITY) ---
  async getChangesInEquity(month: number, year: number): Promise<ChangesInEquityReport> {
    const startDate = new Date(Date.UTC(year, month - 1, 1));
    const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 1. Dapatkan Laba/Rugi Bersih dari laporan Laba Rugi
    const profitLossReport = await this.getProfitLoss(month, year);
    const netProfitLoss = profitLossReport.netProfitLoss;

    // 2. Dapatkan Modal Awal (per akhir periode sebelumnya, atau awal tahun)
    // Asumsi: Akun Modal Pemilik memiliki accountCode '3101'
    const capitalAccount = await this.prisma.account.findUnique({ where: { accountCode: '3101' } });
    if (!capitalAccount) {
      throw new NotFoundException("Account with code '3101' (Owner's Capital) not found. Please create it.");
    }

    // Hitung saldo Modal Awal pada awal periode
    const periodStartDateForCapital = new Date(Date.UTC(year, month - 1, 1)); // Awal bulan ini
    let openingCapital = await this.getAccountBalanceAtDate(capitalAccount.id, new Date(periodStartDateForCapital.getTime() - 1)); // Saldo akhir hari sebelumnya

    // Jika Anda ingin modal awal adalah saldo awal tahun:
    // const startOfYear = new Date(Date.UTC(year, 0, 1));
    // let openingCapital = await this.getAccountBalanceAtDate(capitalAccount.id, new Date(startOfYear.getTime() - 1));


    // 3. Dapatkan Prive/Dividen (Asumsi: Akun Prive memiliki accountCode '3201')
    const drawingsAccount = await this.prisma.account.findUnique({ where: { accountCode: '3201' } });
    let totalDrawings = 0;
    if (drawingsAccount) {
      // Sum debit mutasi Prive dalam periode
      const drawingsItems = await this.prisma.journalItem.findMany({
        where: {
          accountId: drawingsAccount.id,
          journalEntry: {
            transactionDate: { gte: startDate, lte: endDate },
            status: 'APPROVED',
          },
        },
        select: { debit: true, credit: true },
      });
      totalDrawings = drawingsItems.reduce((sum, item) => sum + (parseFloat(item.debit as any) || 0) - (parseFloat(item.credit as any) || 0), 0);
      // Prive biasanya mengurangi modal, jadi sum Debit
    }

    // 4. Hitung Modal Akhir
    const endingCapital = openingCapital + netProfitLoss - totalDrawings;

    return {
      openingCapital: openingCapital,
      netProfitLoss: netProfitLoss,
      drawings: totalDrawings,
      endingCapital: endingCapital,
      startDate: startDate,
      endDate: endDate,
    };
  }

}