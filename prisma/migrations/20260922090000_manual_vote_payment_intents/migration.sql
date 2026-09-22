-- Manual bank-transfer vote payment intents, immutable credits, and lifecycle events.
CREATE TYPE "ManualVotePaymentEventType" AS ENUM ('INTENT_CREATED', 'PROOF_ATTACHED', 'TRANSFER_SUBMITTED', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'CREDIT_REVERSED');

ALTER TYPE "ManualVotePaymentStatus" ADD VALUE IF NOT EXISTS 'INTENT_CREATED';
ALTER TYPE "ManualVotePaymentStatus" ADD VALUE IF NOT EXISTS 'SUBMITTED';
ALTER TYPE "ManualVotePaymentStatus" ADD VALUE IF NOT EXISTS 'CONFIRMED';
ALTER TYPE "ManualVotePaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

ALTER TABLE "ManualVotePayment"
  ADD COLUMN "paymentReference" TEXT,
  ADD COLUMN "voteQuantity" INTEGER,
  ADD COLUMN "expectedAmountNaira" INTEGER,
  ADD COLUMN "proofPublicId" TEXT,
  ADD COLUMN "proofMeta" JSONB,
  ADD COLUMN "bankNameSnapshot" TEXT,
  ADD COLUMN "bankAccountNameSnapshot" TEXT,
  ADD COLUMN "bankAccountNumberSnapshot" TEXT,
  ADD COLUMN "paymentInstructionsSnapshot" TEXT,
  ADD COLUMN "submittedAt" TIMESTAMP(3),
  ADD COLUMN "confirmedAt" TIMESTAMP(3),
  ADD COLUMN "rejectedAt" TIMESTAMP(3),
  ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "ManualVotePayment_paymentReference_key" ON "ManualVotePayment"("paymentReference");
CREATE INDEX "ManualVotePayment_paymentReference_idx" ON "ManualVotePayment"("paymentReference");

CREATE TABLE "ManualVoteCredit" (
  "id" TEXT NOT NULL,
  "voteQuantity" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manualVotePaymentId" TEXT NOT NULL,
  "contestantId" TEXT NOT NULL,
  "competitionId" TEXT NOT NULL,
  "confirmedById" TEXT NOT NULL,
  CONSTRAINT "ManualVoteCredit_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ManualVoteCredit_manualVotePaymentId_key" ON "ManualVoteCredit"("manualVotePaymentId");
CREATE INDEX "ManualVoteCredit_contestantId_idx" ON "ManualVoteCredit"("contestantId");
CREATE INDEX "ManualVoteCredit_competitionId_idx" ON "ManualVoteCredit"("competitionId");

CREATE TABLE "ManualVotePaymentEvent" (
  "id" TEXT NOT NULL,
  "type" "ManualVotePaymentEventType" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "manualVotePaymentId" TEXT NOT NULL,
  "actorId" TEXT,
  CONSTRAINT "ManualVotePaymentEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "ManualVotePaymentEvent_manualVotePaymentId_createdAt_idx" ON "ManualVotePaymentEvent"("manualVotePaymentId", "createdAt");

ALTER TABLE "ManualVoteCredit" ADD CONSTRAINT "ManualVoteCredit_manualVotePaymentId_fkey" FOREIGN KEY ("manualVotePaymentId") REFERENCES "ManualVotePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualVoteCredit" ADD CONSTRAINT "ManualVoteCredit_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualVoteCredit" ADD CONSTRAINT "ManualVoteCredit_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualVoteCredit" ADD CONSTRAINT "ManualVoteCredit_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ManualVotePaymentEvent" ADD CONSTRAINT "ManualVotePaymentEvent_manualVotePaymentId_fkey" FOREIGN KEY ("manualVotePaymentId") REFERENCES "ManualVotePayment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ManualVotePaymentEvent" ADD CONSTRAINT "ManualVotePaymentEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;