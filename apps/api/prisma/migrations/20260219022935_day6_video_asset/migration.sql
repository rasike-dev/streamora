-- AlterTable
ALTER TABLE "UploadIntent" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "uploadedBytes" BIGINT NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VideoAsset" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "durationSec" DOUBLE PRECISION,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoAsset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VideoAsset_videoId_key" ON "VideoAsset"("videoId");

-- CreateIndex
CREATE INDEX "VideoAsset_bucket_idx" ON "VideoAsset"("bucket");

-- AddForeignKey
ALTER TABLE "VideoAsset" ADD CONSTRAINT "VideoAsset_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
