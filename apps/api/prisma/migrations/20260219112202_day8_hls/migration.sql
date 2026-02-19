-- AlterTable
ALTER TABLE "VideoAsset" ADD COLUMN     "hlsBucket" TEXT,
ADD COLUMN     "hlsMasterKey" TEXT;

-- CreateTable
CREATE TABLE "VideoRendition" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "playlistKey" TEXT NOT NULL,
    "bandwidth" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "codec" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoRendition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoRendition_videoId_idx" ON "VideoRendition"("videoId");

-- CreateIndex
CREATE UNIQUE INDEX "VideoRendition_videoId_quality_key" ON "VideoRendition"("videoId", "quality");

-- AddForeignKey
ALTER TABLE "VideoRendition" ADD CONSTRAINT "VideoRendition_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
