-- CreateEnum
CREATE TYPE "MediaKind" AS ENUM ('IMAGE', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "MediaStatus" AS ENUM ('DRAFT', 'UPLOADED', 'PROCESSING', 'PROCESSING_FAILED', 'READY', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'PUBLISHED', 'TAKEDOWN', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "UploadTargetKind" AS ENUM ('VIDEO', 'MEDIA');

-- CreateEnum
CREATE TYPE "MediaAuditAction" AS ENUM ('MEDIA_CREATED', 'MEDIA_SUBMITTED', 'MEDIA_APPROVED', 'MEDIA_REJECTED', 'MEDIA_RESUBMITTED', 'MEDIA_PUBLISHED', 'MEDIA_TAKEDOWN', 'MEDIA_ARCHIVED', 'MEDIA_RESTORED');

-- AlterTable UploadIntent
ALTER TABLE "UploadIntent" ADD COLUMN "targetKind" "UploadTargetKind" NOT NULL DEFAULT 'VIDEO';
ALTER TABLE "UploadIntent" ADD COLUMN "mediaItemId" TEXT;
ALTER TABLE "UploadIntent" ADD COLUMN "originalFilename" TEXT;
ALTER TABLE "UploadIntent" ALTER COLUMN "videoId" DROP NOT NULL;

-- AlterTable ProcessingJob
ALTER TABLE "ProcessingJob" ADD COLUMN "mediaItemId" TEXT;
ALTER TABLE "ProcessingJob" ALTER COLUMN "videoId" DROP NOT NULL;

-- CreateTable MediaItem
CREATE TABLE "MediaItem" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "kind" "MediaKind" NOT NULL,
    "status" "MediaStatus" NOT NULL DEFAULT 'DRAFT',
    "visibility" "VideoVisibility" NOT NULL DEFAULT 'PRIVATE',
    "scheduledAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "scheduleRequested" BOOLEAN NOT NULL DEFAULT false,
    "uploaderId" TEXT,
    "uploaderVisible" BOOLEAN NOT NULL DEFAULT false,
    "rejectionReason" TEXT,
    "rejectionNote" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "resubmittedAt" TIMESTAMP(3),
    "moderationVersion" INTEGER NOT NULL DEFAULT 1,
    "takedownReason" TEXT,
    "takedownNote" TEXT,
    "takenDownAt" TIMESTAMP(3),
    "takenDownBy" TEXT,
    "archivedReason" TEXT,
    "archivedNote" TEXT,
    "archivedAt" TIMESTAMP(3),
    "archivedBy" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaItemTranslation
CREATE TABLE "MediaItemTranslation" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "tagline" TEXT,

    CONSTRAINT "MediaItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaItemChannel
CREATE TABLE "MediaItemChannel" (
    "mediaItemId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,

    CONSTRAINT "MediaItemChannel_pkey" PRIMARY KEY ("mediaItemId","channelId")
);

-- CreateTable MediaItemTag
CREATE TABLE "MediaItemTag" (
    "mediaItemId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "MediaItemTag_pkey" PRIMARY KEY ("mediaItemId","tagId")
);

-- CreateTable MediaAsset
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "originalKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "originalFilename" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "pageCount" INTEGER,
    "previewKey" TEXT,
    "thumbnailKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaShortLink
CREATE TABLE "MediaShortLink" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaShortLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable MediaAuditLog
CREATE TABLE "MediaAuditLog" (
    "id" TEXT NOT NULL,
    "mediaItemId" TEXT NOT NULL,
    "action" "MediaAuditAction" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaItem_slug_key" ON "MediaItem"("slug");
CREATE INDEX "MediaItem_status_idx" ON "MediaItem"("status");
CREATE INDEX "MediaItem_visibility_idx" ON "MediaItem"("visibility");
CREATE INDEX "MediaItem_kind_idx" ON "MediaItem"("kind");
CREATE INDEX "MediaItem_uploaderId_idx" ON "MediaItem"("uploaderId");

CREATE UNIQUE INDEX "MediaItemTranslation_mediaItemId_locale_key" ON "MediaItemTranslation"("mediaItemId", "locale");
CREATE INDEX "MediaItemTranslation_locale_idx" ON "MediaItemTranslation"("locale");

CREATE INDEX "MediaItemChannel_channelId_idx" ON "MediaItemChannel"("channelId");
CREATE INDEX "MediaItemTag_tagId_idx" ON "MediaItemTag"("tagId");

CREATE UNIQUE INDEX "MediaAsset_mediaItemId_key" ON "MediaAsset"("mediaItemId");
CREATE INDEX "MediaAsset_bucket_idx" ON "MediaAsset"("bucket");

CREATE UNIQUE INDEX "MediaShortLink_code_key" ON "MediaShortLink"("code");
CREATE INDEX "MediaShortLink_mediaItemId_idx" ON "MediaShortLink"("mediaItemId");
CREATE INDEX "MediaShortLink_code_idx" ON "MediaShortLink"("code");

CREATE INDEX "MediaAuditLog_mediaItemId_createdAt_idx" ON "MediaAuditLog"("mediaItemId", "createdAt");
CREATE INDEX "MediaAuditLog_action_createdAt_idx" ON "MediaAuditLog"("action", "createdAt");

CREATE INDEX "UploadIntent_mediaItemId_idx" ON "UploadIntent"("mediaItemId");
CREATE INDEX "UploadIntent_targetKind_idx" ON "UploadIntent"("targetKind");
CREATE INDEX "ProcessingJob_mediaItemId_idx" ON "ProcessingJob"("mediaItemId");

-- AddForeignKey
ALTER TABLE "UploadIntent" ADD CONSTRAINT "UploadIntent_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProcessingJob" ADD CONSTRAINT "ProcessingJob_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaItemTranslation" ADD CONSTRAINT "MediaItemTranslation_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItemChannel" ADD CONSTRAINT "MediaItemChannel_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItemChannel" ADD CONSTRAINT "MediaItemChannel_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "Channel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItemTag" ADD CONSTRAINT "MediaItemTag_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaItemTag" ADD CONSTRAINT "MediaItemTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaShortLink" ADD CONSTRAINT "MediaShortLink_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaShortLink" ADD CONSTRAINT "MediaShortLink_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MediaAuditLog" ADD CONSTRAINT "MediaAuditLog_mediaItemId_fkey" FOREIGN KEY ("mediaItemId") REFERENCES "MediaItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
