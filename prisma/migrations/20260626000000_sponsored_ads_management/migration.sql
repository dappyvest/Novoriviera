-- CreateEnum
CREATE TYPE "SponsoredAdPlacement" AS ENUM ('HOME_TOP', 'HOME_MIDDLE', 'LEADERBOARD', 'COMPETITION_PAGE', 'CONTESTANT_PAGE');

-- CreateEnum
CREATE TYPE "SponsoredAdStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'EXPIRED');

-- CreateTable
CREATE TABLE "SponsoredAd" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "videoUrl" TEXT,
    "videoPublicId" TEXT,
    "targetUrl" TEXT,
    "whatsappUrl" TEXT,
    "socialUrl" TEXT,
    "placement" "SponsoredAdPlacement" NOT NULL,
    "status" "SponsoredAdStatus" NOT NULL DEFAULT 'DRAFT',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsoredAd_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsoredAd_placement_status_sortOrder_idx" ON "SponsoredAd"("placement", "status", "sortOrder");

-- CreateIndex
CREATE INDEX "SponsoredAd_startsAt_idx" ON "SponsoredAd"("startsAt");

-- CreateIndex
CREATE INDEX "SponsoredAd_endsAt_idx" ON "SponsoredAd"("endsAt");
