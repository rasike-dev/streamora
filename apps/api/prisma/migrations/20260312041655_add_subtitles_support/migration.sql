-- CreateEnum
CREATE TYPE "SubtitleFormat" AS ENUM ('VTT', 'SRT');

-- CreateTable
CREATE TABLE "VideoSubtitle" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "format" "SubtitleFormat" NOT NULL DEFAULT 'VTT',
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoSubtitle_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoSubtitle_videoId_idx" ON "VideoSubtitle"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoSubtitle_videoId_locale_key" ON "VideoSubtitle"("videoId", "locale");

-- AddForeignKey
ALTER TABLE "VideoSubtitle" ADD CONSTRAINT "VideoSubtitle_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
