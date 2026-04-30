-- CreateEnum
CREATE TYPE "VideoAuditAction" AS ENUM ('VIDEO_CREATED', 'VIDEO_SUBMITTED', 'VIDEO_APPROVED', 'VIDEO_REJECTED', 'VIDEO_RESUBMITTED', 'VIDEO_PUBLISHED', 'VIDEO_TAKEDOWN', 'VIDEO_ARCHIVED', 'VIDEO_RESTORED');

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "archivedBy" TEXT,
ADD COLUMN     "archivedNote" TEXT,
ADD COLUMN     "archivedReason" TEXT,
ADD COLUMN     "takedownNote" TEXT,
ADD COLUMN     "takedownReason" TEXT,
ADD COLUMN     "takenDownAt" TIMESTAMP(3),
ADD COLUMN     "takenDownBy" TEXT;

-- CreateTable
CREATE TABLE "VideoAuditLog" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "action" "VideoAuditAction" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoAuditLog_videoId_createdAt_idx" ON "VideoAuditLog"("videoId", "createdAt");

-- CreateIndex
CREATE INDEX "VideoAuditLog_action_createdAt_idx" ON "VideoAuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "VideoAuditLog" ADD CONSTRAINT "VideoAuditLog_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
