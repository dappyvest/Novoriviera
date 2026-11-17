/*
  Warnings:

  - You are about to drop the column `endsAt` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `startsAt` on the `Competition` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `Stage` table. All the data in the column will be lost.
  - You are about to drop the column `order` on the `Stage` table. All the data in the column will be lost.
  - You are about to drop the column `votingEndsAt` on the `Stage` table. All the data in the column will be lost.
  - You are about to drop the column `votingStartsAt` on the `Stage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[competitionId,stageNumber]` on the table `Stage` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `stageNumber` to the `Stage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Stage` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CompetitionStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropIndex
DROP INDEX "Stage_competitionId_order_key";

-- AlterTable
ALTER TABLE "Competition" DROP COLUMN "endsAt",
DROP COLUMN "startsAt",
ADD COLUMN     "bannerUrl" TEXT,
ADD COLUMN     "endDate" TIMESTAMP(3),
ADD COLUMN     "prizeFirst" TEXT,
ADD COLUMN     "prizeSecond" TEXT,
ADD COLUMN     "prizeThird" TEXT,
ADD COLUMN     "rules" TEXT,
ADD COLUMN     "startDate" TIMESTAMP(3),
ADD COLUMN     "status" "CompetitionStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "Contestant" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "isPremium" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "premiumExpiresAt" TIMESTAMP(3),
ADD COLUMN     "totalOnlineEngagement" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalVotes" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Stage" DROP COLUMN "name",
DROP COLUMN "order",
DROP COLUMN "votingEndsAt",
DROP COLUMN "votingStartsAt",
ADD COLUMN     "eliminationPercentage" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "stageNumber" INTEGER NOT NULL,
ADD COLUMN     "submissionEndDate" TIMESTAMP(3),
ADD COLUMN     "submissionStartDate" TIMESTAMP(3),
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "votingEndDate" TIMESTAMP(3),
ADD COLUMN     "votingStartDate" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Submission" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT,
    "uploadUrl" TEXT,
    "youtubeUrl" TEXT,
    "youtubeVideoId" TEXT,
    "thumbnailUrl" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "contestantId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Submission_contestantId_stageId_key" ON "Submission"("contestantId", "stageId");

-- CreateIndex
CREATE UNIQUE INDEX "Stage_competitionId_stageNumber_key" ON "Stage"("competitionId", "stageNumber");

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
