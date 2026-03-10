-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "publishedAt" TIMESTAMP(3),
ADD COLUMN     "scheduleRequested" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "scheduledAt" TIMESTAMP(3);
