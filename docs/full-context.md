# Ultimate Design — GCP Self-Managed Video Uploading Platform

> **Canonical architecture & implementation reference** (linked from the root [`README.md`](../README.md)).
>
> **Status (August 2026):** Phases **0–3 complete** (Days 1–27). Core product loop is implemented end-to-end: upload → process → moderate → publish → discover → share → analytics → govern. Auth is **Clerk** (Keycloak docs under `docs/keycloak-*` are legacy).
>
> **Companion docs:** [`architecture-summary.md`](./architecture-summary.md) (technical deep dive) · [`product-features-overview.md`](./product-features-overview.md) (stakeholder feature guide) · [`test-plan.md`](./test-plan.md) (verification) · [`stakeholder-onboarding.md`](./stakeholder-onboarding.md) · [`production-runbook.md`](./production-runbook.md) · [`clerk-setup.md`](./clerk-setup.md)

## 1. Core Goals

- **Mobile-first upload + share**: Fast and resilient (resumable, retry, drafts, bulk)
- **Guest creators**: Sign-in via social logins → admin verifies + assigns roles
- **Guest uploads**: Allowed but content + uploader identity hidden until admin approval
- **Channels/categories and tags**: Managed by admins, instantly reflected in UI filters
- **Upload options**: Direct upload and external link ingest (embed + optional import)
- **Bulk processing**: Queue-based processing, autoscaling workers, CDN delivery
- **Full backoffice**: Users, roles, moderation, taxonomy, analytics, audit, ops tools

## 2. High-Level Architecture (GCP)

### Frontend
- **Next.js PWA** (mobile-first)
- **Pages**: Public site + Watch pages + Search + Channels + Share pages
- **Creator portal**: Uploads, drafts, analytics
- **Admin console**: Moderation, users, taxonomy, ops
- **Hosting**: Cloud Run (SSR Next.js) or Firebase Hosting + Cloud Run for SSR

### Backend API
- **NestJS on Cloud Run**
- **PostgreSQL (Cloud SQL)** for system-of-record
- **Redis (Memorystore)** for caching + rate-limits + sessions + queues (if BullMQ)

### Eventing + Jobs
- **Pub/Sub** for events
- **Cloud Run Jobs** (FFmpeg pipeline workers)
- Autoscale to zero, cost-optimized
- Dead-letter queues for failed jobs

### Storage + Delivery
- **Cloud Storage**:
  - Originals (private)
  - Renditions (HLS) (public via CDN or signed)
  - Thumbnails (public via CDN)
  - Captions (VTT/SRT)
- **Cloud CDN + HTTPS Load Balancer** in front of HLS/thumbnail buckets

### Auth / RBAC / Social Login
- **Clerk** (managed IdP) — see [`clerk-setup.md`](./clerk-setup.md)
- Email + Google sign-in; invite-only stakeholder onboarding
- Roles in JWT `publicMetadata.roles`: `VIEWER`, `CREATOR_PENDING`, `CREATOR_APPROVED`, `MODERATOR`, `ADMIN`
- Admin-controlled creator verification + role promotion via API (`POST /admin/users/:id/creator-approve`)

### Observability
- **Cloud Logging + Cloud Monitoring + Error Reporting**
- Structured logs + trace IDs across API + workers

## 3. Roles, Permissions, and Approval Rules

### Roles
- **SUPER_ADMIN**: Platform owner
- **ADMIN**: User + content + taxonomy + ops
- **MODERATOR**: Content moderation + flags + takedowns
- **CREATOR_APPROVED**: Can publish
- **CREATOR_PENDING**: Can upload but not publish/visible
- **VIEWER**: Normal

### Key Rules
- Any social login user starts as **CREATOR_PENDING**
- **Pending creators**:
  - Can upload → videos go to **PENDING_APPROVAL**
  - Videos are not visible to public
  - Uploader identity never displayed anywhere public
- **After admin approves creator (CREATOR_APPROVED)**:
  - Uploader identity can be shown (configurable)
  - Can publish / schedule / unlist

## 4. Video Lifecycle (States)

### VideoStatus
- **DRAFT**
- **UPLOADED**
- **PROCESSING**
- **READY**
- **PENDING_APPROVAL**
- **APPROVED**
- **REJECTED**
- **PUBLISHED**
- **TAKEDOWN** (DMCA / policy)
- **ARCHIVED**

### Visibility
- **PUBLIC**
- **UNLISTED** (share link only)
- **PRIVATE**

### Scheduling
- `publish_at` optional; when reached, transitions to **PUBLISHED**

## 5. Uploading & Ingest Options

### A) Direct Upload (Primary)
- **Resumable uploads** (mobile-friendly)
- Pause/resume, retry, progress, background-friendly
- **Bulk upload** multiple files
- **Draft metadata** before upload
- Upload presets (quality profiles)

**Flow**:
1. Creator opens upload, selects channel/tags/audience (optional), saves draft
2. API returns signed resumable upload URL to originals bucket
3. Client uploads directly to GCS
4. GCS event → Pub/Sub → Worker pipeline
5. When pipeline completes → status **READY** or **PENDING_APPROVAL**

### B) External Link Ingest
- User pastes link (YouTube/Vimeo/etc.)
- Platform stores external record + metadata + embed
- Optional "import/copy" into your storage admin-only (rights-controlled)

## 6. Video Processing Pipeline (Self-Managed)

### Workers (Cloud Run Jobs / Batch)
1. **Validate file**, compute checksum
2. **ffprobe** → duration, resolution, codecs
3. **Generate thumbnails**:
   - 6 frames + 1 "best guess"
4. **Transcode renditions**:
   - e.g. 240p / 360p / 720p / 1080p (preset-based)
5. **Package to HLS**:
   - master.m3u8 + variant playlists + segments
6. **Store outputs** in renditions bucket + thumbs in thumbs bucket
7. **Update DB + emit events**

### Failure Handling
- If job fails → retry policy → DLQ + admin alert

### Nice-to-Have
- "Reprocess" button (change renditions/preset, regenerate thumbnails)

## 7. Discovery Features

- **Full search with facets**:
  - category, subcategory, channel, tags, duration range, date, popularity, visibility
- **Category browse**: `/categories`, `/categories/{slug}`, `/categories/{slug}/{subSlug}` with video counts
- **Breadcrumbs**: category → subcategory → channel on share and channel pages, resolved from the video's primary channel
- **Channel pages**:
  - cover image, description
  - featured/pinned videos
- **Related videos**:
  - channel + tags similarity
- **Trending**:
  - last 24h / 7 days per channel + global
- **Watch history + Continue watching** (signed-in)

## 8. Social Sharing

- **Share page per video**: `/v/{slug}`
- **Correct Open Graph / Twitter tags** (title/description/thumb)
- **Copy buttons**:
  - title, tagline, hashtags, short caption, long caption
- **Share links**: WhatsApp, FB, X, LinkedIn
- **Optional embeddable player** (iframe) with domain allowlist

## 9. Safety, Abuse, Compliance

- **Rate limits**:
  - per user/day upload minutes
  - file size limits
- **Quotas by role** (pending creators lower)
- **Report content/user flow**:
  - reasons, evidence, status tracking
- **DMCA/takedown workflow**:
  - takedown, counter, restore (if you want)
- **Malware scan** (optional) on originals
- **Auto retention**:
  - reject content auto delete after X days
  - lifecycle rules: originals to colder storage after X days

## 10. Analytics

### Creator Dashboard
- Views, watch time, completions (baseline)
- Share click sources (utm links)
- Top videos, top channels, tags performance

### Admin Analytics
- **Platform health**:
  - uploads/day, minutes processed, processing failures
- **Moderation stats**:
  - pending queue sizes, approval SLA
- **Traffic sources** breakdown
- **Storage and CDN costs** (estimates)

## 11. Backoffice (Admin Console) — Full Module List

### User Management
- User list with:
  - provider (Google/Facebook), last login, status
  - role assignment, approval status
- Approve/reject creators + internal notes
- Suspend/disable accounts
- Upload quotas override

### Content Moderation
- **Moderation queue**:
  - Pending approval
  - Flagged content
  - Re-review requested
- **Video review screen**:
  - playback + thumbnails + metadata
  - checklist ("safe", "copyright ok", "metadata ok")
  - approve/reject/takedown
- Internal notes + moderator actions

### Content Management
- Edit metadata (title/desc/tagline/audience)
- Replace source video (optional)
- Reprocess / regenerate thumbnails
- Schedule publish / set visibility
- Manage captions (upload VTT/SRT)

### Taxonomy Management
- Category → Subcategory → Channel hierarchy, CRUD + reorder + archive/restore + move with impact preview ✅
- Channels CRUD + ordering + cover images ✅
- Tags CRUD + preferred (featured) tags ✅
- Tag merge/synonyms ("AI", "A.I.") with alias-preserving slugs ✅
- Tag status governance (`ACTIVE` / `PENDING` / `BLOCKED` / `MERGED`) ✅
- Bulk apply tags/channel

### Reports & Abuse
- Reports inbox (video/user)
- Escalation statuses + actions taken
- DMCA cases + outcomes

### Audit Log (Very Important)
- Every privileged action:
  - role changes, approvals, deletions, takedowns, reprocess jobs

### Ops Tools
- Worker job dashboard (queue depth, failures, retries)
- DLQ viewer + replay
- Processing SLA alerts
- Config toggles (feature flags)

## 12. Data Model (Ultimate Tables)

### Core
- `users`
- `user_identities` (social providers)
- `roles`, `user_roles`
- `creator_profiles` (approval status, notes, quotas)

### Content
- `videos` (status, visibility, publish_at, slug, owner_id nullable for pending privacy)
- `video_assets` (original path, renditions path, thumbs path, checksum)
- `video_renditions` (quality, bitrate, playlist path)
- `video_thumbnails` (path, is_selected)
- `captions` (lang, format, path)

### Metadata
- `categories`, `category_translations`
- `subcategories`, `subcategory_translations`
- `channels` (`subcategory_id`)
- `tags` (`normalized_name` unique, `status`, `merged_into_tag_id`)
- `tag_aliases`
- `video_channels`, `video_tags` (plus `primary_channel_id` on `videos` / `media_items`)
- `taxonomy_audit_log`

### Moderation & Compliance
- `moderation_reviews` (checklists, notes, decisions)
- `reports` (type, reason, status)
- `takedowns` (dmca/policy, dates, status)

### Analytics (Start Simple, Grow Later)
- `video_events` (view/start/complete/share_click) aggregated daily
- `video_daily_stats`

### Ops
- `jobs` (processing jobs)
- `audit_logs` (who did what)

## 13. API Surface (Ultimate, Grouped)

### Auth/RBAC
- `GET /me`
- `GET /admin/users`
- `POST /admin/users/{id}/approve`
- `POST /admin/users/{id}/roles`
- `POST /admin/users/{id}/suspend`

### Upload
- `POST /uploads/draft`
- `POST /uploads/init` (signed resumable URL)
- `POST /uploads/complete`
- `GET /uploads/{id}/status`

### Videos
- `GET /videos` (public, published only)
- `GET /videos/{slug}`
- `GET /channels/{slug}/videos`
- `GET /creator/videos`
- `PATCH /creator/videos/{id}` (edit metadata)
- `POST /creator/videos/{id}/submit-for-approval`
- `POST /creator/videos/{id}/schedule`
- `POST /creator/videos/{id}/visibility`

### Admin Moderation
- `GET /admin/moderation/queue`
- `POST /admin/videos/{id}/approve`
- `POST /admin/videos/{id}/reject`
- `POST /admin/videos/{id}/takedown`
- `POST /admin/videos/{id}/reprocess`

### Taxonomy
- `GET /categories`, `GET /categories/{slug}`, `GET /categories/{categorySlug}/subcategories/{slug}`
- `GET /channels`
- `POST /admin/channels`
- `PATCH /admin/channels/{id}`
- `POST /admin/channels/{id}/move` (re-parent to another subcategory)
- `GET /admin/taxonomy/tree`, `/unmapped-channels`, `/impact`, `/audit`
- `POST|PATCH /admin/categories`, `POST /admin/categories/{id}/archive|restore`, `POST /admin/categories/reorder`
- `POST|PATCH /admin/subcategories`, `POST /admin/subcategories/{id}/archive|restore|move`
- `POST /admin/tags`
- `GET /admin/tags/{id}/merge-preview`, `POST /admin/tags/{id}/merge`
- `PATCH /admin/tags/{id}/status`, `POST /admin/tags/{id}/aliases`

### External
- `POST /external-videos` (link ingest)
- `POST /admin/external-videos/{id}/import`

### Reports
- `POST /reports`
- `GET /admin/reports`
- `POST /admin/reports/{id}/resolve`

### Analytics
- `GET /creator/analytics`
- `GET /admin/analytics`

---

# Implementation Plan (Phased Delivery)

## Phase 0 — Foundations (Days 1–4)

### Day 1 — Repo, Environments, Base App Shells

**Goals**: Monorepo ready, local dev runs, CI skeleton.

**Tasks**:
- Create repo structure:
  - `apps/web` (Next.js PWA)
  - `apps/api` (NestJS)
  - `apps/worker` (FFmpeg job container)
  - `packages/shared` (types, DTOs)
  - `infra/` (terraform or scripts)
- Add lint/format/test configs (eslint, prettier, commit hooks optional)
- Local dev: docker compose for Postgres + Redis
- Base pages:
  - Web: Home, Login, Creator Dashboard, Admin Dashboard (placeholders)
  - API: `/health`, `/version`

**Deliverables**: Repo boots with `pnpm dev` (or npm) and all apps run locally.

**Acceptance Checks**:
- Web renders on mobile viewport
- API responds `/health`
- DB container reachable

### Day 2 — Auth & RBAC Skeleton ✅ (implemented with **Clerk**)

**Original plan**: Keycloak. **As built**: Clerk — see [`clerk-setup.md`](./clerk-setup.md).

**Goals**: Login works, JWT validated by API, role guards exist.

**Tasks (as built)**:
- Clerk application + JWT template `streamora-api` with `roles` from `publicMetadata`
- Roles: `ADMIN`, `MODERATOR`, `CREATOR_PENDING`, `CREATOR_APPROVED`, `VIEWER`
- API:
  - JWT validation middleware/guard (`jose` + Clerk JWKS)
  - `@Roles()` decorator + RolesGuard
  - `GET /me` returns user + roles; provisions local `User` on first call
- Web:
  - Clerk sign-in at `/[locale]/sign-in`
  - Role-gated dashboard and admin areas

**Deliverables**: User can login and see role-based UI areas.

**Acceptance Checks**:
- Access `/admin` blocked unless ADMIN/MODERATOR
- `/me` returns correct roles

### Day 3 — Database Baseline + Core Entities

**Goals**: DB schema ready for users/videos/channels/tags/statuses.

**Tasks**:
- Choose ORM (Prisma recommended) + migrations
- Create core tables (minimal now; extend later):
  - `users` (id, email, displayName, status, createdAt)
  - `user_identities` (provider, providerUserId)
  - `user_roles` (role)
  - `creator_profiles` (approvalStatus, notes, quotas)
  - `channels` (name, slug, active, sortOrder)
  - `tags` (name, preferred)
- API seeds:
  - default admin user mapping strategy (Clerk `sub` → app user via `externalId`)
  - seed channels/tags

**Deliverables**: API can read/write channels/tags.

**Acceptance Checks**: Admin can add a channel and it appears in web dropdown after refresh

### Day 4 — GCP Baseline Infra Blueprint (No Video Yet)

**Goals**: Minimal GCP services planned + deployable targets defined.

**Tasks**:
- Define environments: dev, staging, prod
- Create GCP resource plan:
  - Cloud Run services: web, api
  - Cloud SQL Postgres
  - Memorystore Redis (or skip until Phase 1 if you want)
  - Buckets: originals, renditions, thumbs, captions
  - Pub/Sub topics (create now)
  - Cloud CDN + HTTPS LB plan (enable later once HLS exists)
- Set secret management plan (Secret Manager)
- CI/CD plan: GitHub Actions → Cloud Run deploy

**Deliverables**: "Infra README" with exact commands + env vars.

**Acceptance Checks**: You can deploy "hello" web/api to Cloud Run (even before full features)

---

## Phase 1 — MVP Core (Days 5–12)

End-to-end: upload → process → approve → publish → watch → share

### Day 5 — Upload Init (Direct-to-GCS, Resumable)

**Goals**: Client uploads directly to GCS; API never receives large file.

**Tasks**:
- API:
  - `POST /uploads/init` → returns resumable upload URL (GCS)
  - store upload intent record: filename, contentType, size, userId
  - enforce quotas (basic: max size, pending creator lower limit)
- Web:
  - Upload page with progress bar + retry
  - Store upload id

**Deliverables**: One video file can upload to originals bucket via browser.

**Acceptance Checks**:
- Upload works from mobile network (simulated throttling)
- File appears in GCS under a predictable key

### Day 6 — Upload Complete + Video Record + Status Model

**Goals**: App creates a video record and triggers processing event.

**Tasks**:
- DB:
  - add `videos` table:
    - id, slug, title?, description?, tagline?, audienceFlags?, status, visibility, publishAt?, uploaderId, uploaderVisible, createdAt
  - add `video_assets` (originalPath, checksum?, duration?, etc.)
- API:
  - `POST /uploads/complete`:
    - verify object exists in bucket
    - create videos record (status UPLOADED)
    - publish Pub/Sub event `video.uploaded`
  - `GET /creator/videos` list statuses

**Deliverables**: Upload results in a visible row in "My Uploads" with UPLOADED.

**Acceptance Checks**: Reload shows same record, status persists

### Day 7 — Worker v1: ffprobe + Thumbnails

**Goals**: First processing step works reliably.

**Tasks**:
- Worker container:
  - consumes `video.uploaded`
  - downloads original
  - runs ffprobe → duration, resolution
  - generates 6 thumbnails → upload to thumbs bucket
- DB:
  - `video_thumbnails` table (videoId, path, isSelected)
- API:
  - video status transitions: PROCESSING → READY (temporary, before HLS)

**Deliverables**: Video gets thumbnails generated.

**Acceptance Checks**:
- Creator UI shows thumbnails grid
- Failure path updates status to FAILED_PROCESSING (or PROCESSING_FAILED)

### Day 8 — Worker v2: HLS Renditions (Basic)

**Goals**: Streaming playback works.

**Tasks**:
- Worker:
  - Transcode 2 renditions to start (360p, 720p)
  - Package HLS:
    - master.m3u8
    - variant playlists + segments
  - Upload to renditions bucket
- DB:
  - `video_renditions` table (quality, playlistPath)
  - `videos.playbackUrl` (master path or resolved URL)
- Web:
  - Watch player with hls.js (or native HLS where supported)

**Deliverables**: A processed video can be played from web.

**Acceptance Checks**: Playback works on:
- Desktop Chrome
- Mobile Safari (native HLS)
- Segments served from bucket correctly

### Day 9 — Moderation Workflow (Pending → Approved → Published)

**Goals**: Admin approval gates visibility exactly as you want.

**Tasks**:
- Enforce rules:
  - If uploader is CREATOR_PENDING → video becomes PENDING_APPROVAL
  - Public endpoints only return PUBLISHED
  - uploader identity hidden unless creator approved and video approved
- Admin endpoints:
  - `GET /admin/moderation/queue`
  - `POST /admin/videos/{id}/approve`
  - `POST /admin/videos/{id}/reject`
- Admin UI:
  - moderation queue list + review page + approve/reject buttons

**Deliverables**: Pending video cannot be viewed publicly until approved.

**Acceptance Checks**:
- Public `GET /videos` returns 0 until admin publishes
- Share link fails/404 until published

### Day 10 — Share Page + OG Metadata + Basic Social Share Buttons

**Goals**: Sharing "just works" across social apps.

**Tasks**:
- Public share page `/v/{slug}`
- OG/Twitter metadata:
  - title/description/thumbnail
- Share buttons:
  - WhatsApp, Facebook, X, LinkedIn
- Copy buttons:
  - title, tagline, caption template

**Deliverables**: Link preview renders in WhatsApp/FB with image + title.

**Acceptance Checks**:
- OG tags appear in HTML response (view source)
- Preview works (at least in common debuggers)

### Day 11 — Channels/Tags + Filters (Basic)

**Goals**: Categorization is clean and admin-expandable.

**Tasks**:
- DB:
  - `video_channels`, `video_tags`
- API:
  - `GET /channels`, `POST /admin/channels`
  - `GET /tags`, `POST /admin/tags`
  - Public filter: `GET /videos?channel=&tag=`
- Web:
  - Upload form: select channel(s), add tags
  - Public page: filter UI

**Deliverables**: Channels/tags usable at upload, filter works.

**Acceptance Checks**: Add new channel as admin → appears immediately in upload dropdown after refresh

### Day 12 — Stabilization Day (Quotas, Retries, Logs)

**Goals**: Make it production-safe.

**Tasks**:
- Quotas:
  - max uploads/day for pending creators
  - max file size
- Worker retries:
  - automatic retry N times
  - mark failed jobs
- Logging:
  - correlation id in API + worker
- Minimal admin "Jobs view" (list failed processing)

**Deliverables**: A resilient baseline MVP.

**Acceptance Checks**: A forced FFmpeg failure results in "failed" status + visible in admin jobs list

---

## Phase 2 — Premium Layer (Days 13–21)

Premium features: drafts, bulk upload, thumbnail picker, visibility modes, scheduled publish, channel pages, search facets

### Day 13 — Proper Drafts + Metadata Editor

**Tasks**:
- Video draft creation:
  - `POST /creator/videos/draft`
  - `PATCH /creator/videos/{id}`
- Web draft editor:
  - title/desc/tagline/audience/tags/channels
  - "Save draft", "Start upload"

**Acceptance**: Draft can exist without a file uploaded

### Day 14 — Bulk Upload Manager

**Tasks**:
- Web:
  - multi-file upload queue
  - apply template metadata to all
  - per-file retry + progress list
- API:
  - `POST /uploads/init-batch` (or reuse init per file)

**Acceptance**: Upload 5 files in a queue; failures can retry individually

### Day 15 — Thumbnail Picker + Custom Thumbnail Upload

**Tasks**:
- Web modal:
  - shows 6 thumbs, select one
  - upload custom thumbnail (optional)
- API:
  - `POST /creator/videos/{id}/thumbnail/select`
  - `POST /creator/videos/{id}/thumbnail/upload`

**Acceptance**: Selected thumbnail becomes the one used for OG/share

### Day 16 — Visibility Modes

**Tasks**:
- Add visibility: `PUBLIC | UNLISTED | PRIVATE`
- Rules:
  - PUBLIC listed everywhere
  - UNLISTED only via direct link
  - PRIVATE only creator/admin
- UI controls on creator video page

**Acceptance**: UNLISTED does not show in lists but plays via link for permitted users

### Day 17 — Scheduled Publish

**Tasks**:
- Add `publishAt`
- Scheduler:
  - Cloud Scheduler → API endpoint `/admin/scheduler/publish-due`
  - transitions APPROVED → PUBLISHED when time reached
- UI:
  - schedule date/time picker

**Acceptance**: Video auto-publishes at scheduled time without manual action

### Day 18 — Channel Pages + Featured/Pinned Videos

**Tasks**:
- DB:
  - `channel_featured_videos` (channelId, videoId, order)
- Admin UI:
  - set featured list
- Public UI:
  - `/c/{slug}` with cover + featured + latest list

**Acceptance**: Featured list shows at top, reorder works

### Day 19 — Search + Facets (Basic but Useful)

**Tasks**:
- Implement search:
  - title/description contains
  - facets: channel, tag, date range, duration bucket
- UI:
  - search bar + filters panel (mobile-friendly)

**Acceptance**: Search results update with filters; fast enough with indexing strategy later

### Day 20–21 — Premium Stabilization + Polish

**Tasks**:
- Improve upload UX (better error messages, cancel upload, continue later)
- Harden permissions for all endpoints
- Add caching for channels/tags
- Add basic analytics events capture (view/share click) — optional early seed

**Acceptance**: Smooth "premium" feel, no broken flows

---

## Phase 3 — Power Backoffice + Distribution (Days 22–27) ✅

**Goals**: Discovery polish, distribution tools, moderation feedback loop, post-publication governance.

### Day 22 — Tag Landing Pages ✅

**Deliverables**: Public `/tags/{slug}` pages with locale-aware metadata, paginated `PUBLISHED + PUBLIC` grids, SEO metadata, analytics `?src=tag` attribution.

### Day 23 — Short Share Links ✅

**Deliverables**: `ShortLink` model, `POST /creator/videos/:id/share` (idempotent), public `GET /short-links/:code` redirect to canonical video URL with `?src=share`, web routes `/s/{code}` and `/m/{code}`, copy-to-clipboard in share UI.

### Day 24 — Embed Player ✅

**Deliverables**: `GET /public/videos/:slug/embed` (PUBLISHED + PUBLIC only), minimal iframe player at `/[locale]/embed/[slug]`, `EXTERNAL` analytics source, CSP/frame headers for embedding, copy-embed-code on share and creator edit pages.

### Day 25 — Moderation Improvements ✅

**Deliverables**: Structured rejection with `rejectionReason` / `rejectionNote` / timestamps, creator UI shows rejection feedback, admin queue displays rejection context.

### Day 26 — Resubmission Flow ✅

**Deliverables**: `POST /creator/videos/:id/resubmit` from `REJECTED` → `PENDING_APPROVAL`, `moderationVersion` + `resubmittedAt`, creator resubmit button, admin queue revision badges and prior rejection context.

### Day 27 — Content Governance ✅

**Deliverables**: Takedown / archive / restore for `PUBLISHED` videos, governance fields on `Video`, `VideoAuditLog` + `VideoAuditAction` enum, admin governance endpoints, creator/admin UI panels, public APIs exclude `TAKEDOWN` / `ARCHIVED`.

**Acceptance**: Published video can be taken down or archived with reason; restored videos can return to `PUBLISHED`; audit trail persisted.

---

## Beyond the day plan (also implemented)

| Feature | Summary |
|---------|---------|
| **Subtitles** | Creator upload `.vtt`/`.srt` per locale (en/si/ta); player CC support; `VideoSubtitle` model |
| **Media items** | Parallel ingest for `IMAGE` and `DOCUMENT` assets (`MediaItem`); creator upload at `/upload/media`, moderation at `/admin/media-moderation`; shares moderation/governance patterns with video |
| **Clerk migration** | Replaced Keycloak; no local IdP container; roles synced on creator approval |
| **Day 2.5** | i18n (en/si/ta) via `next-intl`, locale routing, translation tables |
| **Taxonomy & tag governance** | Admin-governed Category → Subcategory → Channel hierarchy with localized names, `primaryChannelId` for deterministic breadcrumbs, contributor tag creation with normalization and merge/block/alias governance, `/categories` browse routes, category and subcategory filters on `/videos`. See [taxonomy-governance-setup.md](./taxonomy-governance-setup.md) |

---

## Phase 4 — Growth & "Ultimate" (Not yet / partial)

| Feature | Status |
|---------|--------|
| Analytics dashboards (creator + admin) | **Done** (Days 20–21) |
| Embeddable player | **Done** (Day 24; domain allowlist not yet) |
| Captions upload workflow | **Done** (subtitles); auto-caption (Speech-to-Text) **not yet** |
| Takedown / archive governance | **Done** (Day 27); full DMCA case management **not yet** |
| Trending / related / watch history | **Not yet** |
| User suspend/disable + internal notes UI | **Partial** (creator approve exists; full user mgmt **not yet**) |
| Reports / abuse flow | **Not yet** |
| Production Redis rate limiting | **Planned** (compose has Redis locally) |
| Full-text search (tsvector / Elasticsearch) | **Not yet** (ILIKE search works for current scale) |
| External link ingest (YouTube/Vimeo embed) | **Not yet** (in original vision) |

---

## Technical Stack Summary

- **Frontend**: Next.js 14+ (App Router), PWA, TypeScript, Tailwind, `next-intl`, hls.js
- **Backend**: NestJS, TypeScript, Prisma
- **Database**: PostgreSQL (Cloud SQL locally via Docker Compose)
- **Cache/Queue**: Redis (Memorystore target; local compose for dev)
- **Storage**: Google Cloud Storage (originals, renditions, thumbnails, subtitles)
- **Processing**: Worker + FFmpeg via Pub/Sub (Cloud Run Jobs in prod)
- **Auth**: **Clerk** (JWT/JWKS validation in API)
- **CDN**: Cloud CDN (production target for HLS/thumbs)
- **Events**: Pub/Sub
- **Monitoring**: Cloud Logging, Cloud Monitoring, Error Reporting; correlation IDs API → worker

---

## Key Design Principles

1. **Mobile-first**: All upload flows optimized for mobile networks
2. **Resilient**: Retry logic, drafts, background-friendly uploads
3. **Privacy-first**: Pending creators' identity hidden until approval
4. **Admin-controlled**: All taxonomy, moderation, and user management
5. **Scalable**: Queue-based processing, autoscaling workers
6. **Observable**: Structured logs, trace IDs, monitoring
7. **Secure**: RBAC, rate limits, quotas, audit logs
