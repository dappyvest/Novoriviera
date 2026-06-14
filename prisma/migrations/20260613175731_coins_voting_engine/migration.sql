/*
  Warnings:

  - Added the required column `type` to the `CoinTransaction` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CoinTransactionType" AS ENUM ('CREDIT', 'DEBIT', 'ADJUSTMENT');

-- AlterTable
ALTER TABLE "CoinTransaction" ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "type" "CoinTransactionType" NOT NULL;

-- CreateTable
CREATE TABLE "CoinPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceNaira" INTEGER NOT NULL,
    "coins" INTEGER NOT NULL,
    "bonusCoins" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoinPackage_pkey" PRIMARY KEY ("id")
);
