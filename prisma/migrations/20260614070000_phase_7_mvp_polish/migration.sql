-- CreateEnum
CREATE TYPE "EngagementPlatform" AS ENUM ('TIKTOK', 'FACEBOOK', 'YOUTUBE', 'INSTAGRAM', 'OTHER');

-- CreateEnum
CREATE TYPE "WinnerPlacement" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- AlterTable
ALTER TABLE "Submission" ADD COLUMN "cloudinaryPublicId" TEXT,
ADD COLUMN "cloudinarySecureUrl" TEXT,
ADD COLUMN "externalVideoUrl" TEXT,
ADD COLUMN "facebookUrl" TEXT,
ADD COLUMN "instagramUrl" TEXT,
ADD COLUMN "tiktokUrl" TEXT,
ADD COLUMN "uploadedFileMeta" JSONB;

-- CreateTable
CREATE TABLE "EngagementBreakdown" (
    "id" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "watchScore" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL,
    "platform" "EngagementPlatform",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "contestantId" TEXT NOT NULL,
    "stageId" TEXT,

    CONSTRAINT "EngagementBreakdown_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompetitionWinner" (
    "id" TEXT NOT NULL,
    "placement" "WinnerPlacement" NOT NULL,
    "prizeAmount" TEXT,
    "totalVotes" INTEGER NOT NULL,
    "totalOnlineEngagement" INTEGER NOT NULL,
    "engagementScore" DOUBLE PRECISION NOT NULL,
    "tokenScore" DOUBLE PRECISION NOT NULL,
    "combinedScore" DOUBLE PRECISION NOT NULL,
    "declaredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "competitionId" TEXT NOT NULL,
    "contestantId" TEXT NOT NULL,

    CONSTRAINT "CompetitionWinner_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionWinner_competitionId_placement_key" ON "CompetitionWinner"("competitionId", "placement");

-- CreateIndex
CREATE UNIQUE INDEX "CompetitionWinner_competitionId_contestantId_key" ON "CompetitionWinner"("competitionId", "contestantId");

-- AddForeignKey
ALTER TABLE "EngagementBreakdown" ADD CONSTRAINT "EngagementBreakdown_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EngagementBreakdown" ADD CONSTRAINT "EngagementBreakdown_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "Stage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionWinner" ADD CONSTRAINT "CompetitionWinner_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "Competition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompetitionWinner" ADD CONSTRAINT "CompetitionWinner_contestantId_fkey" FOREIGN KEY ("contestantId") REFERENCES "Contestant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
