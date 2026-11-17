/*
  Warnings:

  - The values [COIN] on the enum `VoteSource` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `CoinPackage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoinTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CoinWallet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Payment` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[paidVotePaymentId]` on the table `Vote` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "VoteSource_new" AS ENUM ('PAYSTACK', 'ONLINE_ENGAGEMENT', 'ITEM_PURCHASE');
ALTER TABLE "Vote" ALTER COLUMN "source" TYPE "VoteSource_new" USING ("source"::text::"VoteSource_new");
ALTER TYPE "VoteSource" RENAME TO "VoteSource_old";
ALTER TYPE "VoteSource_new" RENAME TO "VoteSource";
DROP TYPE "public"."VoteSource_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "CoinTransaction" DROP CONSTRAINT "CoinTransaction_userId_fkey";

-- DropForeignKey
ALTER TABLE "CoinTransaction" DROP CONSTRAINT "CoinTransaction_walletId_fkey";

-- DropForeignKey
ALTER TABLE "CoinWallet" DROP CONSTRAINT "CoinWallet_userId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_coinPackageId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_competitionId_fkey";

-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- AlterTable
ALTER TABLE "Vote" ADD COLUMN     "paidVotePaymentId" TEXT;

-- DropTable
DROP TABLE "CoinPackage";

-- DropTable
DROP TABLE "CoinTransaction";

-- DropTable
DROP TABLE "CoinWallet";

-- DropTable
DROP TABLE "Payment";

-- DropEnum
DROP TYPE "CoinTransactionType";

-- CreateTable
CREATE TABLE "PaidVotePayment" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "reference" TEXT NOT NULL,
    "amountNaira" INTEGER NOT NULL,
    "amountKobo" INTEGER NOT NULL,
    "voteQuantity" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "voterEmail" TEXT,
    "providerResponse" JSONB,
    "paidAt" TIMESTAMP(3),
    "creditedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitionId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,

    CONSTRAINT "PaidVotePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaidVotePayment_reference_key" ON "PaidVotePayment"("reference");

-- CreateIndex
CREATE INDEX "PaidVotePayment_competitionId_status_createdAt_idx" ON "PaidVotePayment"("competitionId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "PaidVotePayment_contestantId_status_idx" ON "PaidVotePayment"("contestantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Vote_paidVotePaymentId_key" ON "Vote"("paidVotePaymentId");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_paidVotePaymentId_fkey" FOREIGN KEY ("paidVotePaymentId") REFERENCES "PaidVotePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidVotePayment" ADD CONSTRAINT "PaidVotePayment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaidVotePayment" ADD CONSTRAINT "PaidVotePayment_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
