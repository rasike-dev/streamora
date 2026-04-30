-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "moderationVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "resubmittedAt" TIMESTAMP(3);
