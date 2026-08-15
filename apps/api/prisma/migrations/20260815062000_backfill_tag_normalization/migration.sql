-- Backfill step of the expand -> backfill -> enforce sequence. Data only, no DDL.

-- 1. Canonical tag keys.
-- Mirrors normalizeTagName() in apps/api/src/common/taxonomy/normalize.util.ts:
-- strip leading '#', trim, collapse internal whitespace, NFKC-normalize, lower-case.
--
-- Tags that collapse to the same key are NOT all filled in. Only the oldest tag in
-- each group gets the key; later duplicates keep normalizedName = NULL so that the
-- unique index in the next migration can never fail. Those NULL rows are what
-- `pnpm --filter api tag:duplicates` reports for admin merge.
WITH normalized AS (
    SELECT
        id,
        lower(
            normalize(
                regexp_replace(
                    btrim(regexp_replace("name", '^#+', '')),
                    '\s+', ' ', 'g'
                ),
                NFKC
            )
        ) AS norm,
        "createdAt"
    FROM "Tag"
),
ranked AS (
    SELECT
        id,
        norm,
        ROW_NUMBER() OVER (PARTITION BY norm ORDER BY "createdAt" ASC, id ASC) AS rn
    FROM normalized
    WHERE norm IS NOT NULL AND norm <> ''
)
UPDATE "Tag" t
SET "normalizedName" = r.norm
FROM ranked r
WHERE r.id = t.id
  AND r.rn = 1
  AND t."normalizedName" IS NULL;

-- 2. Primary channel for existing content.
-- Every video/media item that already has channel assignments gets a deterministic
-- primary so the Category > Subcategory > Channel breadcrumb resolves for legacy rows
-- instead of silently rendering nothing.
UPDATE "Video" v
SET "primaryChannelId" = sub."channelId"
FROM (
    SELECT DISTINCT ON ("videoId") "videoId", "channelId"
    FROM "VideoChannel"
    ORDER BY "videoId", "channelId"
) sub
WHERE sub."videoId" = v.id
  AND v."primaryChannelId" IS NULL;

UPDATE "MediaItem" m
SET "primaryChannelId" = sub."channelId"
FROM (
    SELECT DISTINCT ON ("mediaItemId") "mediaItemId", "channelId"
    FROM "MediaItemChannel"
    ORDER BY "mediaItemId", "channelId"
) sub
WHERE sub."mediaItemId" = m.id
  AND m."primaryChannelId" IS NULL;
