/*
  Warnings:

  - The `visibility` column on the `Video` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "VideoVisibility" AS ENUM ('PUBLIC', 'UNLISTED', 'PRIVATE');

-- AlterTable
ALTER TABLE "Video" DROP COLUMN "visibility",
ADD COLUMN     "visibility" "VideoVisibility" NOT NULL DEFAULT 'PRIVATE';

-- DropEnum
DROP TYPE "Visibility";

-- CreateIndex
CREATE INDEX "Video_visibility_idx" ON "Video"("visibility");
