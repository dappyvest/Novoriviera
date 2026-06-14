/*
  Warnings:

  - You are about to drop the column `amount` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `currency` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `metadata` on the `Payment` table. All the data in the column will be lost.
  - You are about to drop the column `providerReference` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[reference]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `amountNaira` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coinPackageId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `coins` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `reference` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCoins` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `userId` on table `Payment` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Payment" DROP CONSTRAINT "Payment_userId_fkey";

-- DropIndex
DROP INDEX "Payment_providerReference_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "amount",
DROP COLUMN "currency",
DROP COLUMN "metadata",
DROP COLUMN "providerReference",
ADD COLUMN     "amountNaira" INTEGER NOT NULL,
ADD COLUMN     "bonusCoins" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "coinPackageId" TEXT NOT NULL,
ADD COLUMN     "coins" INTEGER NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "providerResponse" JSONB,
ADD COLUMN     "reference" TEXT NOT NULL,
ADD COLUMN     "totalCoins" INTEGER NOT NULL,
ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_coinPackageId_fkey" FOREIGN KEY ("coinPackageId") REFERENCES "CoinPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
