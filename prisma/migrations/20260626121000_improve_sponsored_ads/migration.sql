-- CreateEnum
CREATE TYPE "SponsoredAdDestinationType" AS ENUM ('WEBSITE', 'WHATSAPP', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'OTHER');

-- AlterTable
ALTER TABLE "SponsoredAd"
ADD COLUMN "placements" "SponsoredAdPlacement"[] NOT NULL DEFAULT ARRAY[]::"SponsoredAdPlacement"[],
ADD COLUMN "destinationType" "SponsoredAdDestinationType" NOT NULL DEFAULT 'WEBSITE',
ADD COLUMN "destinationValue" TEXT,
ADD COLUMN "buttonText" TEXT;

-- Backfill multi-placement and destination metadata from existing single-placement/link fields.
UPDATE "SponsoredAd"
SET
  "placements" = ARRAY["placement"]::"SponsoredAdPlacement"[],
  "destinationType" = CASE
    WHEN "whatsappUrl" IS NOT NULL THEN 'WHATSAPP'::"SponsoredAdDestinationType"
    WHEN "socialUrl" IS NOT NULL AND "socialUrl" ILIKE '%facebook%' THEN 'FACEBOOK'::"SponsoredAdDestinationType"
    WHEN "socialUrl" IS NOT NULL AND "socialUrl" ILIKE '%instagram%' THEN 'INSTAGRAM'::"SponsoredAdDestinationType"
    WHEN "socialUrl" IS NOT NULL AND "socialUrl" ILIKE '%tiktok%' THEN 'TIKTOK'::"SponsoredAdDestinationType"
    WHEN "socialUrl" IS NOT NULL AND ("socialUrl" ILIKE '%youtube%' OR "socialUrl" ILIKE '%youtu.be%') THEN 'YOUTUBE'::"SponsoredAdDestinationType"
    WHEN "socialUrl" IS NOT NULL THEN 'OTHER'::"SponsoredAdDestinationType"
    ELSE 'WEBSITE'::"SponsoredAdDestinationType"
  END,
  "destinationValue" = COALESCE("targetUrl", "whatsappUrl", "socialUrl")
WHERE cardinality("placements") = 0;
