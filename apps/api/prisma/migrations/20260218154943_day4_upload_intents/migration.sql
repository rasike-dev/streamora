-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('INITIATED', 'UPLOADING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "UploadIntent" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'INITIATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadIntent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UploadIntent_videoId_idx" ON "UploadIntent"("videoId");

-- CreateIndex
CREATE INDEX "UploadIntent_status_idx" ON "UploadIntent"("status");

-- AddForeignKey
ALTER TABLE "UploadIntent" ADD CONSTRAINT "UploadIntent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
