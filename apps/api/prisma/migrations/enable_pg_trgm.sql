-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add trigram indexes on VideoTranslation fields for faster fuzzy matching
CREATE INDEX IF NOT EXISTS idx_video_translation_title_trgm 
ON "VideoTranslation" USING gin ("title" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_video_translation_description_trgm 
ON "VideoTranslation" USING gin ("description" gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_video_translation_tagline_trgm 
ON "VideoTranslation" USING gin ("tagline" gin_trgm_ops);
