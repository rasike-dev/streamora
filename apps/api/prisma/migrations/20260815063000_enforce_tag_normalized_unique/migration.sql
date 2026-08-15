-- Enforce step of the expand -> backfill -> enforce sequence.
-- Safe by construction: the backfill migration leaves duplicate candidates NULL, and
-- PostgreSQL unique indexes permit multiple NULLs.
CREATE UNIQUE INDEX "Tag_normalizedName_key" ON "Tag"("normalizedName");
