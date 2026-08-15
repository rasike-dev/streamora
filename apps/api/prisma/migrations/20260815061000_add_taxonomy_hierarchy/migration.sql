-- Expand step of the expand -> backfill -> enforce sequence.
-- Only additive changes here: new tables plus nullable columns, so this migration
-- is safe to deploy while the previous API revision is still serving traffic.

-- CreateEnum
CREATE TYPE "TagStatus" AS ENUM ('ACTIVE', 'PENDING', 'BLOCKED', 'MERGED');

-- CreateEnum
CREATE TYPE "TaxonomyEntityType" AS ENUM ('CATEGORY', 'SUBCATEGORY', 'CHANNEL', 'TAG');

-- CreateEnum
CREATE TYPE "TaxonomyAuditAction" AS ENUM ('TAXONOMY_CREATED', 'TAXONOMY_UPDATED', 'TAXONOMY_ARCHIVED', 'TAXONOMY_RESTORED', 'TAXONOMY_MOVED', 'TAXONOMY_REORDERED', 'TAG_MERGED', 'TAG_STATUS_CHANGED', 'TAG_ALIAS_ADDED');

-- AlterTable
ALTER TABLE "Channel" ADD COLUMN     "subcategoryId" TEXT;

-- AlterTable
ALTER TABLE "MediaItem" ADD COLUMN     "primaryChannelId" TEXT;

-- AlterTable
ALTER TABLE "MediaItemTag" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Tag" ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "mergedIntoTagId" TEXT,
ADD COLUMN     "normalizedName" TEXT,
ADD COLUMN     "status" "TagStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "primaryChannelId" TEXT;

-- AlterTable
ALTER TABLE "VideoTag" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CategoryTranslation" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "CategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubcategoryTranslation" (
    "id" TEXT NOT NULL,
    "subcategoryId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubcategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TagAlias" (
    "id" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "normalizedAlias" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TagAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" "TaxonomyEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" "TaxonomyAuditAction" NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaxonomyAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_slug_idx" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_isActive_idx" ON "Category"("isActive");

-- CreateIndex
CREATE INDEX "Category_displayOrder_idx" ON "Category"("displayOrder");

-- CreateIndex
CREATE INDEX "CategoryTranslation_locale_idx" ON "CategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryTranslation_categoryId_locale_key" ON "CategoryTranslation"("categoryId", "locale");

-- CreateIndex
CREATE INDEX "Subcategory_categoryId_idx" ON "Subcategory"("categoryId");

-- CreateIndex
CREATE INDEX "Subcategory_isActive_idx" ON "Subcategory"("isActive");

-- CreateIndex
CREATE INDEX "Subcategory_displayOrder_idx" ON "Subcategory"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Subcategory_categoryId_slug_key" ON "Subcategory"("categoryId", "slug");

-- CreateIndex
CREATE INDEX "SubcategoryTranslation_locale_idx" ON "SubcategoryTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "SubcategoryTranslation_subcategoryId_locale_key" ON "SubcategoryTranslation"("subcategoryId", "locale");

-- CreateIndex
CREATE UNIQUE INDEX "TagAlias_normalizedAlias_key" ON "TagAlias"("normalizedAlias");

-- CreateIndex
CREATE INDEX "TagAlias_tagId_idx" ON "TagAlias"("tagId");

-- CreateIndex
CREATE INDEX "TaxonomyAuditLog_entityType_entityId_createdAt_idx" ON "TaxonomyAuditLog"("entityType", "entityId", "createdAt");

-- CreateIndex
CREATE INDEX "TaxonomyAuditLog_action_createdAt_idx" ON "TaxonomyAuditLog"("action", "createdAt");

-- CreateIndex
CREATE INDEX "Channel_subcategoryId_idx" ON "Channel"("subcategoryId");

-- CreateIndex
CREATE INDEX "MediaItem_primaryChannelId_idx" ON "MediaItem"("primaryChannelId");

-- CreateIndex
CREATE INDEX "Tag_status_idx" ON "Tag"("status");

-- CreateIndex
CREATE INDEX "Video_primaryChannelId_idx" ON "Video"("primaryChannelId");

-- AddForeignKey
ALTER TABLE "CategoryTranslation" ADD CONSTRAINT "CategoryTranslation_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subcategory" ADD CONSTRAINT "Subcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubcategoryTranslation" ADD CONSTRAINT "SubcategoryTranslation_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Channel" ADD CONSTRAINT "Channel_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Subcategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_mergedIntoTagId_fkey" FOREIGN KEY ("mergedIntoTagId") REFERENCES "Tag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TagAlias" ADD CONSTRAINT "TagAlias_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_primaryChannelId_fkey" FOREIGN KEY ("primaryChannelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaItem" ADD CONSTRAINT "MediaItem_primaryChannelId_fkey" FOREIGN KEY ("primaryChannelId") REFERENCES "Channel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
