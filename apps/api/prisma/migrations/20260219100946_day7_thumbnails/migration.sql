-- CreateTable
CREATE TABLE "VideoThumbnail" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "timeSec" DOUBLE PRECISION,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoThumbnail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoThumbnail_videoId_idx" ON "VideoThumbnail"("videoId");

-- AddForeignKey
ALTER TABLE "VideoThumbnail" ADD CONSTRAINT "VideoThumbnail_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
