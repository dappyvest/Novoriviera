-- CreateEnum
CREATE TYPE "ManualVotePaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Competition"
ADD COLUMN "manualVotingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "votePriceNaira" INTEGER NOT NULL DEFAULT 500,
ADD COLUMN "paymentBankName" TEXT,
ADD COLUMN "paymentAccountName" TEXT,
ADD COLUMN "paymentAccountNumber" TEXT,
ADD COLUMN "paymentInstructions" TEXT;

-- AlterTable
ALTER TABLE "Contestant" ADD COLUMN "contestantCode" TEXT;

-- Backfill existing contestants with stable human-readable codes.
WITH numbered AS (
  SELECT id, 100000 + row_number() OVER (ORDER BY "createdAt", id) AS code_number
  FROM "Contestant"
)
UPDATE "Contestant"
SET "contestantCode" = 'NRV-' || numbered.code_number::text
FROM numbered
WHERE "Contestant".id = numbered.id;

ALTER TABLE "Contestant" ALTER COLUMN "contestantCode" SET NOT NULL;

-- CreateTable
CREATE TABLE "ManualVotePayment" (
  "id" TEXT NOT NULL,
  "contestantCode" TEXT NOT NULL,
  "voterName" TEXT NOT NULL,
  "voterPhone" TEXT NOT NULL,
  "voterEmail" TEXT,
  "amountPaid" INTEGER NOT NULL,
  "votePriceNaira" INTEGER NOT NULL,
  "votesCalculated" INTEGER NOT NULL,
  "transferReference" TEXT,
  "paymentNarration" TEXT,
  "proofImageUrl" TEXT,
  "note" TEXT,
  "status" "ManualVotePaymentStatus" NOT NULL DEFAULT 'PENDING',
  "adminNote" TEXT,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "contestantId" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "verifiedById" TEXT,

  CONSTRAINT "ManualVotePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Contestant_contestantCode_key" ON "Contestant"("contestantCode");

-- CreateIndex
CREATE INDEX "ManualVotePayment_status_createdAt_idx" ON "ManualVotePayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ManualVotePayment_competitionId_status_idx" ON "ManualVotePayment"("competitionId", "status");

-- CreateIndex
CREATE INDEX "ManualVotePayment_contestantCode_idx" ON "ManualVotePayment"("contestantCode");

-- AddForeignKey
ALTER TABLE "ManualVotePayment" ADD CONSTRAINT "ManualVotePayment_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualVotePayment" ADD CONSTRAINT "ManualVotePayment_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualVotePayment" ADD CONSTRAINT "ManualVotePayment_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
