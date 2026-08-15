-- Corrects the canonical key for names that begin with whitespace before the '#'.
-- The original backfill stripped '#' before trimming, so "  #speeches" keyed as
-- "#speeches" instead of "speeches". normalizeTagName() now trims first; this
-- realigns any rows written under the old order.
--
-- Rows whose corrected key is already taken by another tag are left alone: they
-- are genuine duplicates for an admin to merge, and `pnpm --filter api
-- tag:duplicates` lists them.
WITH corrected AS (
    SELECT
        id,
        lower(
            normalize(
                regexp_replace(
                    btrim(regexp_replace(btrim("name"), '^#+', '')),
                    '\s+', ' ', 'g'
                ),
                NFKC
            )
        ) AS norm
    FROM "Tag"
)
UPDATE "Tag" t
SET "normalizedName" = c.norm
FROM corrected c
WHERE c.id = t.id
  AND c.norm <> ''
  AND t."normalizedName" IS DISTINCT FROM c.norm
  AND NOT EXISTS (
      SELECT 1 FROM "Tag" other
      WHERE other."normalizedName" = c.norm
        AND other.id <> t.id
  );
