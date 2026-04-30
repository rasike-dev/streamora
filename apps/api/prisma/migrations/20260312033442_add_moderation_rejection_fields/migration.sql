-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "rejectedAt" TIMESTAMP(3),
ADD COLUMN     "rejectedBy" TEXT,
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "rejectionReason" TEXT;
