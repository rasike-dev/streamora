-- CreateEnum
CREATE TYPE "VideoSourceType" AS ENUM ('UPLOAD', 'EXTERNAL_EMBED');

-- CreateEnum
CREATE TYPE "ExternalEmbedProvider" AS ENUM ('YOUTUBE', 'FACEBOOK', 'VIMEO', 'OTHER');

-- CreateEnum
CREATE TYPE "ExternalEmbedValidationStatus" AS ENUM ('PENDING', 'ACTIVE', 'UNAVAILABLE', 'ERROR');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN "sourceType" "VideoSourceType" NOT NULL DEFAULT 'UPLOAD';

-- CreateTable
CREATE TABLE "VideoExternalEmbed" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "provider" "ExternalEmbedProvider" NOT NULL,
    "canonicalUrl" TEXT NOT NULL,
    "embedUrl" TEXT NOT NULL,
    "embedWidth" INTEGER,
    "embedHeight" INTEGER,
    "oEmbedThumbnailUrl" TEXT,
    "validationStatus" "ExternalEmbedValidationStatus" NOT NULL DEFAULT 'PENDING',
    "lastValidatedAt" TIMESTAMP(3),
    "nextValidationAt" TIMESTAMP(3),
    "lastValidationError" TEXT,
    "unavailableSince" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoExternalEmbed_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoExternalEmbed_videoId_key" ON "VideoExternalEmbed"("videoId");

-- CreateIndex
CREATE INDEX "VideoExternalEmbed_validationStatus_nextValidationAt_idx" ON "VideoExternalEmbed"("validationStatus", "nextValidationAt");

-- CreateIndex
CREATE INDEX "VideoExternalEmbed_provider_idx" ON "VideoExternalEmbed"("provider");

-- CreateIndex
CREATE INDEX "Video_sourceType_idx" ON "Video"("sourceType");

-- AddForeignKey
ALTER TABLE "VideoExternalEmbed" ADD CONSTRAINT "VideoExternalEmbed_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
