-- CreateEnum
CREATE TYPE "VideoAnalyticsEventType" AS ENUM ('IMPRESSION', 'PLAY_START', 'HEARTBEAT', 'PLAY_COMPLETE');

-- CreateEnum
CREATE TYPE "VideoTrafficSource" AS ENUM ('DIRECT', 'SHARE', 'CHANNEL', 'TAG', 'SEARCH', 'EXTERNAL', 'UNKNOWN');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "analyticsCompletions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "analyticsLastViewedAt" TIMESTAMP(3),
ADD COLUMN     "analyticsViews" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "VideoAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "eventType" "VideoAnalyticsEventType" NOT NULL,
    "trafficSource" "VideoTrafficSource" NOT NULL DEFAULT 'UNKNOWN',
    "sessionId" TEXT NOT NULL,
    "viewerHash" TEXT,
    "locale" TEXT,
    "progressPercent" DOUBLE PRECISION,
    "positionSeconds" DOUBLE PRECISION,
    "durationSeconds" DOUBLE PRECISION,
    "referrerHost" TEXT,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "uniqueViewers" INTEGER NOT NULL DEFAULT 0,
    "playStarts" INTEGER NOT NULL DEFAULT 0,
    "completions" INTEGER NOT NULL DEFAULT 0,
    "directViews" INTEGER NOT NULL DEFAULT 0,
    "shareViews" INTEGER NOT NULL DEFAULT 0,
    "channelViews" INTEGER NOT NULL DEFAULT 0,
    "tagViews" INTEGER NOT NULL DEFAULT 0,
    "searchViews" INTEGER NOT NULL DEFAULT 0,
    "externalViews" INTEGER NOT NULL DEFAULT 0,
    "unknownViews" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),

    CONSTRAINT "VideoAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAnalyticsEvent_videoId_createdAt_idx" ON "VideoAnalyticsEvent"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoAnalyticsEvent_videoId_eventType_createdAt_idx" ON "VideoAnalyticsEvent"("videoId", "eventType", "createdAt");

-- CreateIndex
CREATE INDEX "VideoAnalyticsEvent_videoId_sessionId_idx" ON "VideoAnalyticsEvent"("videoId", "sessionId");

-- CreateIndex
CREATE INDEX "VideoAnalyticsDaily_videoId_date_idx" ON "VideoAnalyticsDaily"("videoId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "VideoAnalyticsDaily_videoId_date_key" ON "VideoAnalyticsDaily"("videoId", "date");

-- AddForeignKey
ALTER TABLE "VideoAnalyticsEvent" ADD CONSTRAINT "VideoAnalyticsEvent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoAnalyticsDaily" ADD CONSTRAINT "VideoAnalyticsDaily_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
