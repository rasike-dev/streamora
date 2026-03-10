-- CreateEnum
CREATE TYPE "ThumbnailSource" AS ENUM ('AUTO', 'CUSTOM');

-- AlterTable
ALTER TABLE "VideoThumbnail" ADD COLUMN     "source" "ThumbnailSource" NOT NULL DEFAULT 'AUTO';

-- CreateIndex
CREATE INDEX "VideoThumbnail_videoId_isSelected_idx" ON "VideoThumbnail"("videoId", "isSelected");

-- CreateIndex
CREATE INDEX "VideoThumbnail_videoId_createdAt_idx" ON "VideoThumbnail"("videoId", "createdAt");
