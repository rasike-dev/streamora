-- Brings the previously loose `enable_pg_trgm.sql` into migration history.
-- SearchService ranks results with similarity(), which requires pg_trgm; without
-- this extension every keyword search fails at runtime on a fresh database.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Re-create the trigram indexes under Prisma's naming convention so the schema
-- (VideoTranslation @@index(..., type: Gin)) stays the single source of truth.
DROP INDEX IF EXISTS "idx_video_translation_title_trgm";
DROP INDEX IF EXISTS "idx_video_translation_description_trgm";
DROP INDEX IF EXISTS "idx_video_translation_tagline_trgm";

CREATE INDEX IF NOT EXISTS "VideoTranslation_title_idx" ON "VideoTranslation" USING GIN ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "VideoTranslation_description_idx" ON "VideoTranslation" USING GIN ("description" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "VideoTranslation_tagline_idx" ON "VideoTranslation" USING GIN ("tagline" gin_trgm_ops);
