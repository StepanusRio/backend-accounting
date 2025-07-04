-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'STAFF');

-- CreateEnum
CREATE TYPE "NormalBalance" AS ENUM ('DEBIT', 'KREDIT');

-- CreateEnum
CREATE TYPE "ReportPosition" AS ENUM ('NERACA', 'LABA_RUGI');

-- CreateEnum
CREATE TYPE "HelperType" AS ENUM ('CUSTOMER', 'VENDOR', 'BANK');

-- CreateEnum
CREATE TYPE "JournalStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STAFF',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" SERIAL NOT NULL,
    "kode_akun" TEXT NOT NULL,
    "nama_akun" TEXT NOT NULL,
    "pos_saldo" "NormalBalance" NOT NULL,
    "pos_laporan" "ReportPosition" NOT NULL,
    "saldo_awal" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "butuh_bantuan" BOOLEAN NOT NULL DEFAULT false,
    "helperType" "HelperType",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "kode_customer" TEXT NOT NULL,
    "nama_customer" TEXT NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo_normal" "NormalBalance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" SERIAL NOT NULL,
    "kode_vendor" TEXT NOT NULL,
    "nama_vendor" TEXT NOT NULL,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo_normal" "NormalBalance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bank" (
    "id" SERIAL NOT NULL,
    "kode_bank" TEXT NOT NULL,
    "nama_bank" TEXT NOT NULL,
    "nomor_rekening" TEXT,
    "openingBalance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "saldo_normal" "NormalBalance" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" SERIAL NOT NULL,
    "tanggal_transaksi" DATE NOT NULL,
    "no_bukti" TEXT NOT NULL,
    "keterangan" TEXT NOT NULL,
    "status" "JournalStatus" NOT NULL DEFAULT 'DRAFT',
    "createdByUserId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "staffApprovedByUserId" INTEGER,
    "staffApprovedAt" TIMESTAMP(3),
    "managerApprovedByUserId" INTEGER,
    "managerApprovedAt" TIMESTAMP(3),

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalItem" (
    "id" SERIAL NOT NULL,
    "jurnal_id" INTEGER NOT NULL,
    "akun_id" INTEGER NOT NULL,
    "debit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "customerId" INTEGER,
    "vendorId" INTEGER,
    "bankId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_kode_akun_key" ON "Account"("kode_akun");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_kode_customer_key" ON "Customer"("kode_customer");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_kode_vendor_key" ON "Vendor"("kode_vendor");

-- CreateIndex
CREATE UNIQUE INDEX "Bank_kode_bank_key" ON "Bank"("kode_bank");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_no_bukti_key" ON "JournalEntry"("no_bukti");

-- CreateIndex
CREATE INDEX "JournalItem_jurnal_id_idx" ON "JournalItem"("jurnal_id");

-- CreateIndex
CREATE INDEX "JournalItem_akun_id_idx" ON "JournalItem"("akun_id");

-- CreateIndex
CREATE INDEX "JournalItem_customerId_idx" ON "JournalItem"("customerId");

-- CreateIndex
CREATE INDEX "JournalItem_vendorId_idx" ON "JournalItem"("vendorId");

-- CreateIndex
CREATE INDEX "JournalItem_bankId_idx" ON "JournalItem"("bankId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_staffApprovedByUserId_fkey" FOREIGN KEY ("staffApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_managerApprovedByUserId_fkey" FOREIGN KEY ("managerApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_jurnal_id_fkey" FOREIGN KEY ("jurnal_id") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_akun_id_fkey" FOREIGN KEY ("akun_id") REFERENCES "Account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalItem" ADD CONSTRAINT "JournalItem_bankId_fkey" FOREIGN KEY ("bankId") REFERENCES "Bank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add the CHECK constraint after table creation
ALTER TABLE "JournalItem" ADD CONSTRAINT one_helper_id_at_most CHECK (
  ("customerId" IS NOT NULL AND "vendorId" IS NULL AND "bankId" IS NULL) OR
  ("customerId" IS NULL AND "vendorId" IS NOT NULL AND "bankId" IS NULL) OR
  ("customerId" IS NULL AND "vendorId" IS NULL AND "bankId" IS NOT NULL) OR
  ("customerId" IS NULL AND "vendorId" IS NULL AND "bankId" IS NULL)
);
