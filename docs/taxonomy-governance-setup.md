# Taxonomy, Channel and Tag Governance — Setup

Implements `Streamora_Taxonomy_Channel_Tag_Governance_Technical_Proposal_v1.0.docx` (Phases A–E). Phase F — alias-authoring UI, suggested tags, taxonomy analytics and caching — is deliberately deferred.

For the surrounding architecture see [`architecture-summary.md`](./architecture-summary.md); for the migration ordering in a real deploy see [`production-runbook.md`](./production-runbook.md).

## What this adds

A three-level, admin-governed classification tree on top of the channels that already existed:

```
Category → Subcategory → Channel → Video / MediaItem
```

Plus governed **Tags**: contributors may create tags while uploading, admins and moderators can merge, block, alias and feature them, and merged slugs keep resolving so no shared link breaks.

### Model decisions worth knowing

| Decision | Why |
|----------|-----|
| `VideoChannel` many-to-many is preserved | A video can still sit in several channels; nothing that existed was taken away. |
| New `Video.primaryChannelId` / `MediaItem.primaryChannelId` | One channel is the *classification* channel, which is what breadcrumbs and category filters resolve through. Without it, a multi-channel video has no single answer for "what category is this?". |
| Category/Subcategory are never stored on the video | They resolve through `primaryChannelId → Channel.subcategoryId → Subcategory.categoryId`, so re-parenting a channel reclassifies its content automatically and cannot drift. |
| `Channel.subcategoryId` is nullable in the database | Pre-existing channels (`technology`, `education`) have no subcategory. They surface in the admin **Unmapped** bucket instead of failing a migration. The admin API still requires a subcategory on create/update. |
| Category and Subcategory are translated (en/si/ta) from day one | `Channel` and `Tag` already had translation tables; leaving the two new levels unlocalized would have been the only monolingual surface in the product. |
| `MediaItem` gets the same treatment | Media already had channels and tags. Governing only videos would leave a second, ungoverned tag vocabulary. |

## Schema

New models in [`apps/api/prisma/schema.prisma`](../apps/api/prisma/schema.prisma):

- `Category`, `CategoryTranslation` — slug-unique, `displayOrder`, `isActive`.
- `Subcategory`, `SubcategoryTranslation` — slug unique *within a category* (`@@unique([categoryId, slug])`), so `/categories/:categorySlug/subcategories/:slug` is unambiguous.
- `TagAlias` — `normalizedAlias` unique; how merged tag slugs keep resolving.
- `TaxonomyAuditLog` — mirrors the existing `VideoAuditLog` shape.

Extended models:

- `Channel.subcategoryId` (nullable, `onDelete: Restrict`).
- `Video.primaryChannelId`, `MediaItem.primaryChannelId`.
- `Tag.normalizedName` (unique), `Tag.status`, `Tag.createdById`, `Tag.mergedIntoTagId`.
- `VideoTag` / `MediaItemTag`: `addedById`, `createdAt`.

New enums: `TagStatus { ACTIVE PENDING BLOCKED MERGED }`, `TaxonomyEntityType`, `TaxonomyAuditAction`.

`Tag.preferred` already existed and serves the proposal's "Featured" capability, so no new field was added for it.

## Migration sequence

Run in this order. The tag normalization is split into three steps so that a duplicate-tag collision can never fail a deploy — the unique index is applied only after the data is known to be clean.

| Order | Migration | What it does |
|-------|-----------|--------------|
| 1 | `20260815060000_enable_pg_trgm_search` | Enables `pg_trgm` and brings the fuzzy-search indexes under Prisma's ownership. |
| 2 | `20260815061000_add_taxonomy_hierarchy` | New tables and nullable columns only. Safe on a live database. |
| 3 | `20260815062000_backfill_tag_normalization` | Populates `Tag.normalizedName`, leaving the loser of any collision at `NULL`. No constraint yet. |
| 4 | `20260815063000_enforce_tag_normalized_unique` | Adds the unique index. Cannot fail, because losers carry `NULL`. |
| 5 | `20260815064000_renormalize_tag_keys` | Re-keys tags for the corrected normalization order (trim → strip `#` → trim), skipping any row that would collide. |

```bash
# 1. Apply the migrations
DATABASE_URL="postgresql://..." pnpm --filter api exec prisma migrate deploy

# 2. List the tags that collided and so were left without a canonical key
pnpm --filter api tag:duplicates
```

The backfill deliberately leaves the loser of each collision with `normalizedName = NULL`, which is why the unique index in step 4 cannot fail a deploy. The cost is that those rows do not participate in canonical lookup until an admin merges them, so the report exists to find them.

[`apps/api/prisma/scripts/tag-duplicate-report.ts`](../apps/api/prisma/scripts/tag-duplicate-report.ts) groups tags by normalized key, prints every group with more than one member with usage counts, nominates a keeper, and emits the exact merge call. It exits non-zero while collisions remain, so it can gate a deploy pipeline.

> The `Tag.normalizedName` unique index is the only migration in this set that could have failed on real data. The three-step sequence plus the NULL-loser rule is what removes that risk.

## Seed

[`apps/api/prisma/seed.ts`](../apps/api/prisma/seed.ts) reads [`apps/api/prisma/data/taxonomy-seed.ts`](../apps/api/prisma/data/taxonomy-seed.ts) and upserts the 10 categories from proposal §5 with their subcategories and en/si/ta translations:

`leadership-speeches`, `election-campaigns`, `party-events`, `media-coverage`, `social-media-content`, `district-local-content`, `historical-archive`, `training-capacity-building`, `community-engagement`, `claims-fact-checks`.

The seed is idempotent: it never resurrects a category an admin archived and never re-parents a channel. The pre-existing `technology` and `education` channels are deliberately left unmapped so the admin mapping workflow is exercised rather than assumed.

```bash
pnpm --filter api exec prisma db seed
```

## Normalization

[`apps/api/src/common/taxonomy/normalize.util.ts`](../apps/api/src/common/taxonomy/normalize.util.ts) is the single source of truth for tag identity:

- `normalizeTagName()` — trim, strip leading `#`, trim again, collapse internal whitespace, NFKC, lowercase. The order matters: `" #tag"` must key the same as `"tag"`.
- `slugify()` — keeps Unicode letters, combining marks and the zero-width joiner, so Sinhala and Tamil names keep their vowel signs and conjuncts instead of being mangled into a different word.
- `validateTagName()` — length limit (60), reserved-word rejection, returns the canonical name/key/slug so callers never re-derive them.
- `resolveUniqueSlug()` — appends a numeric discriminator; takes its `isTaken` probe as an argument so it works inside a transaction.

The SQL in `20260815062000_backfill_tag_normalization` mirrors `normalizeTagName()` exactly. **If you change one, change both**, or backfilled rows and runtime lookups will disagree and duplicate tags will reappear.

Constants: `MAX_TAG_NAME_LENGTH = 60`, `MAX_TAGS_PER_ITEM = 15`.

## API surface

### Public

| Method | Route | Notes |
|--------|-------|-------|
| `GET` | `/categories` | Localized tree for the browse pages. |
| `GET` | `/categories/:slug` | Subcategories with video counts. |
| `GET` | `/categories/:categorySlug/subcategories/:slug` | Channels with video counts. |
| `GET` | `/tags` | `ACTIVE` tags only — `PENDING` tags stay out of public autocomplete. |
| `GET` | `/videos` | Now also accepts `category` and `subcategory` slug filters. |
| `GET` | `/tags/:slug` | Resolves through `TagAlias` and `mergedIntoTagId`, returning `redirectedFrom`. |

`GET /channels/:slug` and `GET /videos/by-slug/:slug` now return a localized `breadcrumb` (category → subcategory → channel), or `null` ancestors for a still-unmapped channel.

### Admin — taxonomy (`@Roles('ADMIN')`)

`GET /admin/taxonomy/tree`, `GET /admin/taxonomy/unmapped-channels`, `GET /admin/taxonomy/impact`, `GET /admin/taxonomy/audit`;
`POST|PATCH /admin/categories`, `POST /admin/categories/:id/archive|restore`, `POST /admin/categories/reorder`;
`POST|PATCH /admin/subcategories`, `POST /admin/subcategories/:id/archive|restore|move`, `POST /admin/categories/:id/subcategories/reorder`;
`POST /admin/channels/:id/move`, plus `subcategoryId` on channel create/update.

Archive is blocked while dependents exist, a move requires an explicit destination, and every mutation writes a `TaxonomyAuditLog` row.

### Admin — tags (`@Roles('ADMIN', 'MODERATOR')`)

`GET /admin/tags` (usage counts, status filter), `GET /admin/tags/:id/merge-preview`, `POST /admin/tags/:id/merge`, `PATCH /admin/tags/:id/status`, `POST /admin/tags/:id/aliases`.

Merge moves `VideoTag` and `MediaItemTag` rows onto the target, drops rows that would duplicate an existing assignment, tombstones the source as `MERGED`, and writes a `TagAlias` for the losing slug so its landing page keeps working.

## Write path

`TagsService.findOrCreate()` normalizes, matches the canonical name then the aliases, and creates inside a transaction. It catches the unique-constraint race from two uploads creating the same tag at once and re-reads the winner rather than failing the request.

Tags created by a `CREATOR_PENDING` uploader are created as `PENDING`: usable on their own video, hidden from public autocomplete. Approved creators produce `ACTIVE` tags. This mirrors Streamora's existing dual-gate trust model.

**Behavior change:** `updateDraftFull` used to silently drop unknown channel slugs. It now raises `BadRequestException` for unknown or inactive channels (proposal §18). It also maintains `primaryChannelId` — defaulting to the first selected channel, cleared when channels are emptied — rejects `BLOCKED` tags, and enforces the 15-tag ceiling. The legacy `updateDraft` / `createDraft` ID-based paths and `media.service.ts` maintain the same invariants.

## Web

| Route | Purpose |
|-------|---------|
| `/[locale]/categories` | All categories with their subcategories. |
| `/[locale]/categories/[slug]` | One category; subcategories with counts. |
| `/[locale]/categories/[slug]/[subSlug]` | One subcategory; channels with counts. |
| `/[locale]/admin/taxonomy` | Three-column drill-down: reorder, archive, move with impact preview, unmapped-channel bucket. |
| `/[locale]/admin/tags` | Search, status filter, merge preview, block, feature. |

The video editor ([`video-draft-editor.tsx`](../apps/web/src/components/video-draft-editor.tsx)) gained cascading Category → Subcategory → Channel selectors, a primary-channel radio, and tag autocomplete-with-create. Contributors cannot create categories, subcategories or channels from this form (AC-04).

Breadcrumbs appear on `/v/[slug]` and `/channels/[slug]`; share-page tags became links to `/tags/[slug]`.

Two dead files were resolved rather than left half-wired: `video-draft-form.tsx` (unused, ID-based, would have bypassed the new rules) was deleted, and `public-video-filters.tsx` (unused) became the real filter UI on `/videos`.

New i18n namespaces in `apps/web/messages/{en,si,ta}.json`: `taxonomy`, `categoryPage`, `subcategoryPage`, `adminTaxonomy`, `adminTags`.

## Tests

`pnpm --filter api test` — 111 tests across 12 suites. The taxonomy-specific ones:

| Suite | Covers |
|-------|--------|
| `common/taxonomy/normalize.util.spec.ts` | Normalization order, Unicode slugs, validation, slug collisions. |
| `taxonomy/content-taxonomy.service.spec.ts` | Slug/ID channel resolution, primary-channel invariant. |
| `taxonomy/admin-taxonomy.service.spec.ts` | Archive dependency rules, move validation, audit writes. |
| `taxonomy/taxonomy.service.spec.ts` | Locale fallback, breadcrumbs including unmapped channels. |
| `tags/tags.service.spec.ts` | `findOrCreate`, alias and merge following, blocked tags, the creation race, tag ceiling. |
| `tags/admin-tags.service.spec.ts` | Merge dedupe, tombstone, alias creation, block detaching assignments. |
| `auth/taxonomy-permissions.spec.ts` | The permission matrix on every new controller and handler. |
| `search/search.service.spec.ts` | Dynamic SQL parameter binding, `EXISTS` filters (no double-counting on multi-channel videos). |
| `public/public-videos.filters.spec.ts`, `public/public-tags.service.spec.ts` | Filter composition; alias/merge slug resolution. |
| `videos/videos.service.spec.ts`, `media/media.service.spec.ts` | Write-path parity between videos and media. |

## Troubleshooting

**`prisma migrate dev` refuses to run.** It is interactive and fails in a non-interactive shell. Use `prisma migrate deploy`, or `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` to generate SQL for a hand-written migration.

**A tag is not matched by autocomplete even though it exists.** It probably lost a normalization collision and carries `normalizedName = NULL`. Run `pnpm --filter api tag:duplicates` and merge it into the keeper from `/admin/tags`.

**A channel does not appear under any category.** It has no `subcategoryId`. Find it under **Unmapped** on `/admin/taxonomy` and move it; its videos are reclassified automatically.

**Search returns a video more than once.** Should not happen — taxonomy filters use `EXISTS` clauses specifically to avoid the multi-channel double-count. If it does, check `buildTaxonomyFilters` in `search.service.ts` for a join that slipped back in.
