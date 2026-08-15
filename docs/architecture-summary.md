# Streamora — Architecture Summary

> **Prepared for**: Enterprise Architect Interview  
> **Date**: March 11, 2026  
> **System**: GCP Self-Managed Video Uploading Platform  
> **Stage**: Phase 0-3 complete (30 development days), production-ready

---

## 1. Executive Overview

Streamora is a **self-managed video uploading, processing, and distribution platform** built on Google Cloud Platform. It enables creators to upload video content that is transcoded into adaptive bitrate (HLS) streams, moderated by administrators, and served to viewers via CDN.

The platform is designed around three core principles: **mobile-first upload UX**, **privacy-first creator identity management**, and **admin-controlled content governance**. It supports a multi-role workflow where guest creators can upload content that remains invisible to the public until an administrator explicitly approves both the creator and their content.

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                            │
│  ┌──────────────────────┐                                                       │
│  │  Next.js PWA (Web)   │  Mobile-first, SSR, i18n (en/si/ta)                  │
│  │  Port 3000           │  App Router, Tailwind CSS, hls.js                     │
│  └──────────┬───────────┘                                                       │
│             │                                                                   │
│     ┌───────▼───────┐     Direct-to-GCS                                         │
│     │   REST API    │◄──── Resumable Upload ────►┌─────────────────────────┐     │
│     │   (NestJS)    │                            │  Google Cloud Storage   │     │
│     │   Port 3001   │                            │  (Originals bucket)     │     │
│     └───┬───┬───┬───┘                            └─────────────────────────┘     │
│         │   │   │                                                               │
│   ┌─────┘   │   └──────┐                                                        │
│   │         │          │                                                        │
│   ▼         ▼          ▼                                                        │
│ ┌─────┐ ┌──────┐ ┌─────────┐                                                   │
│ │ DB  │ │Pub/  │ │ Clerk   │                                                    │
│ │Postgres│Sub  │ │  IAM    │                                                    │
│ └─────┘ └──┬───┘ └─────────┘                                                   │
│            │                                                                    │
│            ▼                                                                    │
│    ┌───────────────┐        ┌─────────────────────────┐                         │
│    │  Worker       │───────►│  Google Cloud Storage   │                         │
│    │  (FFmpeg)     │        │  Renditions + Thumbs    │                         │
│    │  Pub/Sub sub  │        │  buckets                │                         │
│    └───────────────┘        └──────────┬──────────────┘                         │
│                                        │                                        │
│                                        ▼                                        │
│                               ┌────────────────┐                                │
│                               │   Cloud CDN     │                                │
│                               │   (HLS + thumbs)│                                │
│                               └────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack Decisions

### 3.1 Monorepo with pnpm Workspaces

**Choice**: Single repository with three apps (`web`, `api`, `worker`) and a shared package.

**Reasoning**:
- **Atomic changes**: A single PR can modify the API contract and the frontend consumer simultaneously, preventing integration drift.
- **Shared types**: The `@streamora/shared` package exports role constants and DTOs that both the API and web app consume, providing compile-time safety across service boundaries.
- **Simplified CI/CD**: One repository means one pipeline with selective builds, reducing operational overhead versus managing three separate repos for a small team.
- **pnpm over npm/yarn**: pnpm's content-addressable store and strict dependency hoisting prevents phantom dependency issues. Workspace protocol (`workspace:*`) guarantees the shared package always resolves locally.

**Trade-off acknowledged**: As team size grows beyond 5-8 engineers, build times and merge conflicts in a monorepo may warrant migrating to separate repositories with published packages. The `@streamora/shared` package is already structured for this extraction.

---

### 3.2 Frontend — Next.js 14 (App Router) with PWA

**Choice**: Next.js 14 with App Router, server-side rendering, Tailwind CSS, and `next-intl` for internationalization.

**Reasoning**:
- **SSR for SEO and social sharing**: Video share pages (`/v/{slug}`) require server-rendered Open Graph metadata. When a link is shared on WhatsApp/Facebook/X, the social crawler receives fully-rendered `<meta>` tags including title, description, and thumbnail URL — this is impossible with a pure SPA.
- **App Router**: File-based routing with `[locale]` dynamic segments gives a clean URL structure (`/en/v/my-video`, `/si/tags/education`). Server Components reduce client bundle size for data-fetching pages.
- **Internationalization (en/si/ta)**: The `next-intl` middleware intercepts every request and resolves the locale from the URL prefix. Message bundles are loaded per-locale at the layout level. This was chosen over a runtime-only i18n approach because Next.js can statically optimize per-locale pages.
- **Tailwind CSS**: Utility-first styling enables mobile-first responsive design without writing custom CSS files. The design system uses responsive breakpoints (`grid-cols-2 md:grid-cols-3 lg:grid-cols-4`) for video grids.
- **hls.js**: Client-side HLS playback via `hls.js` for browsers that don't natively support HLS (Chrome, Firefox), with native HLS fallback for Safari. This dual approach ensures cross-browser streaming compatibility.

**PWA rationale**: Mobile-first target audience (creators uploading from phones). Resumable uploads via XHR with progress tracking (`Content-Range` headers) ensure reliability on unstable mobile networks.

---

### 3.3 Backend — NestJS on Node.js

**Choice**: NestJS 10 with TypeScript, modular architecture, Passport.js/jose for JWT validation.

**Reasoning**:
- **TypeScript end-to-end**: Same language as the frontend, enabling shared type contracts via `@streamora/shared`. A Go or Java API would introduce a language boundary and require separate DTO generation.
- **NestJS module system**: The application is decomposed into feature modules (`AuthModule`, `VideosModule`, `ChannelsModule`, `TagsModule`) with explicit dependency injection. This enforces separation of concerns — for example, the `PrismaModule` is shared across all feature modules but the `GcsService` is only injected where storage access is needed.
- **Decorator-based RBAC**: Custom `@Roles('ADMIN', 'MODERATOR')` decorator combined with `RolesGuard` provides declarative authorization at the controller level. The guard reads roles from the JWT `roles` claim (from Clerk `publicMetadata.roles`), meaning role assignments are managed in Clerk and reflected in API tokens.
- **Middleware for observability**: `RequestIdMiddleware` generates or propagates `x-request-id` across the entire request lifecycle. This correlation ID is logged in API controllers and forwarded in Pub/Sub messages to the worker, enabling distributed tracing without a full tracing SDK.

**Why not microservices**: At the current scale (single-digit team, ~60 API endpoints), a modular monolith in NestJS provides the benefits of logical separation without the operational cost of inter-service networking, distributed transactions, and independent deployments. The module boundaries (auth, videos, uploads, admin, public) are designed as future extraction points if horizontal scaling of specific domains becomes necessary.

---

### 3.4 Database — PostgreSQL with Prisma ORM

**Choice**: PostgreSQL 15, Prisma 5.19 as the ORM, migration-based schema management.

**Reasoning**:
- **PostgreSQL**: The data model is inherently relational — videos belong to creators, have many-to-many relationships with channels and tags, and require transactional consistency for state machine transitions (e.g., `UPLOADED → PROCESSING → READY → PUBLISHED`). A document database would require application-level join logic and lack transactional guarantees for multi-table updates.
- **Prisma over TypeORM/Knex**: Prisma provides a declarative schema (`schema.prisma`) that serves as the single source of truth for both the database schema and the generated TypeScript client. The generated client provides type-safe queries (e.g., `prisma.video.findMany({ where: { status: 'PUBLISHED' }, include: { translations: true } })`) that catch schema mismatches at compile time. Migration files are auto-generated from schema diffs.
- **Enum-based state machines**: `VideoStatus`, `VideoVisibility`, `CreatorApprovalStatus`, `JobStatus`, and `UploadStatus` are PostgreSQL enums. This enforces valid state values at the database level, preventing invalid states even if application logic has a bug.
- **Translation tables**: Content metadata (video title, channel name, tag name) is stored in separate `*Translation` tables with a `(entityId, locale)` unique constraint. This allows adding new locales without schema changes and supports locale-aware queries with fallback logic (requested locale → English → base name).

**Indexing strategy**: Composite indexes on high-cardinality query patterns — `(videoId, date)` for analytics, `(videoId, isSelected)` for thumbnail lookup, `(status)` and `(visibility)` for content filtering. The `slug` columns have unique indexes for O(1) public URL resolution.

---

### 3.5 Authentication — Clerk (Managed IdP)

**Choice**: [Clerk](https://clerk.com) as the identity provider, with JWT validation in the API using the `jose` library and a Clerk JWT template named `streamora-api`.

**Reasoning**:
- **Faster stakeholder onboarding**: Invite-only sign-up, email + Google, no self-hosted IdP to operate locally or in production.
- **Roles in public metadata**: Clerk stores Streamora roles in `publicMetadata.roles` (`CREATOR_PENDING`, `CREATOR_APPROVED`, `ADMIN`, etc.). The JWT template exposes them as a `roles` claim for the API.
- **JWT validation with JWKS**: The `JwtGuard` uses `jose.jwtVerify` against Clerk's JWKS URL. The API never stores Clerk signing secrets — only issuer, audience, and JWKS endpoint in env.
- **Creator approval sync**: `POST /admin/users/:id/creator-approve` updates Postgres and promotes Clerk metadata to `CREATOR_APPROVED` automatically.

**Dual-guard pattern**: The API has two guards — `JwtGuard` (authentication) and `RolesGuard` (authorization). Public endpoints omit both. Creator endpoints use only `JwtGuard`. Admin endpoints stack both with `@Roles('ADMIN', 'MODERATOR')`.

See [`clerk-setup.md`](./clerk-setup.md) for provisioning steps.

---

### 3.6 Object Storage — Google Cloud Storage (Multi-Bucket)

**Choice**: Three separate GCS buckets — originals (private), renditions (CDN-fronted), thumbnails (CDN-fronted).

**Reasoning**:
- **Bucket separation for access control**: Original uploads contain raw, unprocessed content that may be rejected during moderation. These stay in a private bucket with no public access. Renditions and thumbnails are public-read (or signed-URL access) after content is approved. Separate buckets allow different IAM policies and lifecycle rules.
- **Direct-to-GCS resumable upload**: The API never receives the video file body. Instead, `POST /uploads/init` generates a GCS resumable upload session URL, and the browser uploads directly to GCS using the `XMLHttpRequest` API with `Content-Range` headers. This offloads bandwidth from the API server, enables pause/resume on mobile, and scales independently of API capacity.
- **Lifecycle rules**: Originals can be moved to Nearline/Coldline storage after processing. Rejected content can be auto-deleted after a retention period. These rules are GCS-native and don't require application code.
- **CDN delivery**: Renditions and thumbnails buckets sit behind Cloud CDN with immutable `Cache-Control: public, max-age=31536000` headers on HLS segments. The master playlist has a shorter TTL to allow adding new renditions.

---

### 3.7 Event-Driven Processing — Pub/Sub + Worker

**Choice**: Google Cloud Pub/Sub for event messaging, a dedicated Node.js worker process for video processing.

**Reasoning**:
- **Decoupled processing**: The upload-complete endpoint publishes a `video.uploaded` event to Pub/Sub and returns immediately. The worker subscribes to this topic and processes asynchronously. This means upload latency is not affected by transcoding time (which can be minutes).
- **At-least-once delivery with idempotency**: Pub/Sub guarantees at-least-once delivery. The worker checks for an existing `RUNNING` job before creating a new one, preventing duplicate processing when a message is redelivered. Failed messages are `nack()`ed for automatic retry.
- **Single-topic event contract**: The event payload includes `type`, `videoId`, `uploadIntentId`, `bucket`, `objectKey`, `correlationId`, and `occurredAt`. The `correlationId` is propagated from the API's `x-request-id`, enabling end-to-end tracing from the HTTP request through Pub/Sub to the worker.
- **FFmpeg pipeline**: The worker runs `ffprobe` for metadata extraction, generates 6 thumbnails at computed timestamps, and produces HLS output with two renditions (360p at 800kbps, 720p at 2.8Mbps). The single-pass `ffmpeg` command uses `filter_complex` to split the input into two scaled variants, reducing encoding time versus two separate passes.

**Worker isolation**: The worker is a separate Node.js process (`apps/worker`) with its own `PrismaClient` and GCS client. It doesn't share a process with the API, so a long-running FFmpeg job can't block API request handling. In production, workers run as Cloud Run Jobs that scale to zero when idle.

---

### 3.8 Video Processing Pipeline

```
┌─────────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│  Download   │────►│  ffprobe │────►│  Thumbnails  │────►│  HLS         │
│  original   │     │  metadata│     │  6 frames    │     │  Transcode   │
│  from GCS   │     │  (dur,   │     │  spread      │     │  360p + 720p │
│             │     │  w x h)  │     │  across      │     │  master.m3u8 │
└─────────────┘     └──────────┘     │  timeline    │     │  4s segments │
                                     └──────────────┘     └──────────────┘
                                           │                     │
                                           ▼                     ▼
                                     ┌──────────┐         ┌──────────┐
                                     │  Upload  │         │  Upload  │
                                     │  to GCS  │         │  to GCS  │
                                     │  thumbs  │         │renditions│
                                     │  bucket  │         │  bucket  │
                                     └──────────┘         └──────────┘
                                           │                     │
                                           └──────────┬──────────┘
                                                      ▼
                                              ┌──────────────┐
                                              │  Update DB   │
                                              │  status →    │
                                              │  APPROVED or │
                                              │PENDING_APPROVAL│
                                              └──────────────┘
```

**Post-processing status logic**: If the uploader's `CreatorProfile.approval` is `APPROVED`, the video transitions directly to `APPROVED`. If the creator is still `PENDING`, the video enters `PENDING_APPROVAL` and waits in the moderation queue.

---

### 3.9 Content Moderation & Video Lifecycle

**Choice**: An 11-state finite state machine governing video lifecycle, combined with role-based creator approval.

```
DRAFT → UPLOADED → PROCESSING → READY ─┬─► PENDING_APPROVAL → APPROVED → PUBLISHED
                      │                 │                         │
                      ▼                 │                         ▼
              PROCESSING_FAILED         │                      SCHEDULED
                                        │                      (via scheduledAt)
                                        │
                                        └─► APPROVED (if creator pre-approved)
                                                    │
                                                    ▼
                                                PUBLISHED

PUBLISHED ──► TAKEDOWN (DMCA/policy) ──► RESTORE ──► PUBLISHED
PUBLISHED ──► ARCHIVED ──► RESTORE ──► PUBLISHED
PENDING_APPROVAL ──► REJECTED (moderation) ──► RESUBMIT ──► PENDING_APPROVAL
```

**Reasoning**:
- **Privacy-first for pending creators**: Any user who signs up via social login starts as `CREATOR_PENDING`. Their uploaded videos are invisible to the public (status `PENDING_APPROVAL`), and their identity (`uploaderVisible = false`) is never exposed until an admin explicitly approves the creator. This prevents spam, abuse, and unauthorized content from appearing on the platform.
- **Dual approval gates**: Both the *creator* and the *content* must be approved. A pending creator's videos require admin review. An approved creator's videos skip the moderation queue and go directly to `APPROVED`.
- **Visibility layer**: Independent of status, the `VideoVisibility` enum (`PUBLIC`, `UNLISTED`, `PRIVATE`) controls discoverability. `UNLISTED` videos are playable via direct link but excluded from listings, search, channel pages, and tag pages.
- **Scheduled publishing**: The `ScheduledPublisherService` runs a cron job every minute, querying for videos with `status: APPROVED, scheduleRequested: true, scheduledAt <= now()` and transitioning them to `PUBLISHED`. This is implemented using `@nestjs/schedule` with `updateMany` (idempotent) to handle concurrent cron executions safely.

---

### 3.10 Analytics Architecture

**Choice**: Dual-layer analytics — raw event capture + daily aggregation tables with denormalized counters on the video record.

**Reasoning**:
- **Raw events for flexibility**: `VideoAnalyticsEvent` records every `IMPRESSION`, `PLAY_START`, `HEARTBEAT` (25%/50%/75%), and `PLAY_COMPLETE` event with session ID, viewer hash, traffic source, locale, and position data. This enables future analysis (e.g., drop-off curves, A/B testing) without losing granularity.
- **Daily aggregation for performance**: `VideoAnalyticsDaily` pre-aggregates per-video-per-day metrics (views, unique viewers, play starts, completions) and traffic source breakdown. Creator dashboard queries aggregate across this table, which has far fewer rows than raw events.
- **Denormalized counters for sorting**: `Video.analyticsViews` and `Video.analyticsCompletions` are updated transactionally alongside the daily aggregate. This allows sorting the public video listing by popularity without joining the analytics table.
- **Privacy-conscious tracking**: Viewer identity is hashed (`SHA-256` of session ID + user agent + IP), never stored in plaintext. IP addresses are hashed separately. Session IDs are browser-scoped (`sessionStorage`), not cross-session persistent.
- **Client-side instrumentation**: The `PublicVideoPlayer` component fires events on `play`, `timeupdate` (milestone-based), and `ended`. The `trackVideoEvent` function uses `fetch` with `keepalive: true` to ensure analytics events are sent even during page navigation.
- **Traffic source attribution**: Every internal link appends `?src=channel|tag|search|share` to video URLs. The share page reads this parameter and passes it as the `trafficSource` for all analytics events during that session.

---

## 4. Data Model Design

### 4.1 Core Entity Relationships

```
User ─────────────┬── UserRole (many: ADMIN, MODERATOR, CREATOR_*, VIEWER)
                  ├── CreatorProfile (one: approval status, quotas)
                  └── Video[] (one-to-many: uploader)

Category ─────────── CategoryTranslation[]
   └── Subcategory ── SubcategoryTranslation[]
          └── Channel (subcategoryId, nullable for legacy rows)

Video ────────────┬── VideoTranslation[] (one-per-locale: title, desc, tagline)
                  ├── VideoChannel[] ──── Channel ── ChannelTranslation[]
                  ├── primaryChannelId ── Channel (classification + breadcrumb)
                  ├── VideoTag[] ──────── Tag ────── TagTranslation[]
                  │                        └── TagAlias[] / mergedIntoTagId
                  ├── UploadIntent[] (tracks upload sessions, resumability)
                  ├── VideoAsset (one: original + HLS pointers)
                  ├── VideoThumbnail[] (6 auto + optional custom)
                  ├── VideoRendition[] (360p, 720p)
                  ├── ProcessingJob[] (worker job tracking)
                  ├── VideoAnalyticsEvent[] (raw events)
                  └── VideoAnalyticsDaily[] (daily aggregates)
```

### 4.2 Key Design Decisions in the Schema

| Decision | Reasoning |
|----------|-----------|
| `externalId` (Clerk `sub`) as the user identity bridge | The API creates a local `User` record on first `/me` call, linked by Clerk's `sub` claim. Application data stays decoupled from the IdP. |
| Many-to-many for channels and tags | Videos can belong to multiple channels and have multiple tags. Join tables (`VideoChannel`, `VideoTag`) with composite primary keys avoid duplicate entries and support efficient index-based queries. |
| Separate `UploadIntent` model | Tracks each upload attempt independently. A single video can have multiple intents (failed uploads, retries). The intent stores `objectKey`, `bucket`, `sizeBytes`, and `status`, enabling resume-by-ID and size verification on completion. |
| `VideoAsset` as a single record per video | Stores both the original file pointer and the HLS master playlist pointer. This is a 1:1 relationship because a video has exactly one source file and one set of HLS outputs at a time. Reprocessing overwrites the HLS pointers. |
| `ThumbnailSource` enum (AUTO vs CUSTOM) | When a creator uploads a custom thumbnail, auto-generated thumbnails are preserved. Reprocessing only deletes `AUTO` thumbnails, preserving the custom selection. |
| `ProcessingJob` with `correlationId` | Links the job back to the originating API request via the `x-request-id`, enabling end-to-end tracing. `attempts` and `lastError` support retry visibility in the admin jobs dashboard. |
| `primaryChannelId` alongside the many-to-many `VideoChannel` | A video can sit in several channels, so "which category is this video in?" has no single answer without a designated channel. The primary channel supplies a deterministic breadcrumb and category filter while multi-channel membership is preserved. |
| Category and Subcategory are not columns on `Video` | They resolve through `primaryChannelId → Channel.subcategoryId → Subcategory.categoryId`. Re-parenting a channel reclassifies its content automatically, and the three levels cannot drift out of agreement. |
| `Tag.normalizedName` unique, with `TagAlias` and `mergedIntoTagId` | Contributors create tags freely, so canonical identity has to be computed (trim, strip `#`, NFKC, collapse, lowercase) rather than trusted. Merging tombstones the loser and keeps an alias, so `/tags/{slug}` links shared before the merge still resolve. |
| `Channel.subcategoryId` nullable in the database, required by the admin API | A `NOT NULL` constraint would have failed on channels that predate the hierarchy. Unmapped channels surface in an admin bucket instead. |

---

## 5. API Design Principles

### 5.1 Route Naming Convention

The API uses a **role-prefixed route structure**:

| Prefix | Auth Required | Target Audience | Example |
|--------|---------------|-----------------|---------|
| `/public/*` | No | Anonymous viewers | `GET /public/videos` |
| `/tags/:slug` | No | Anonymous viewers | `GET /tags/education` |
| `/analytics/*` | No | Client-side tracker | `POST /analytics/videos/:id/events` |
| `/creator/*` | JWT (any role) | Content creators | `GET /creator/videos` |
| `/uploads/*` | JWT (any role) | Content creators | `POST /uploads/init` |
| `/admin/*` | JWT + ADMIN/MODERATOR | Platform operators | `GET /admin/moderation/queue` |
| `/channels`, `/tags` | JWT (any role) | Creator forms | `GET /channels` |
| `/categories` | No | Anonymous viewers | `GET /categories/leadership-speeches` |

**Reasoning**: This prefix convention makes it immediately clear from the URL what authentication level is required and who the intended consumer is. It also allows future API gateway rules to be applied by prefix (e.g., rate-limit `/public/*` differently from `/admin/*`).

### 5.2 Controller Decomposition

The API has ~25 controllers, each handling a narrow slice of functionality (e.g., `UploadCompleteV2Controller` handles only `POST /uploads/:id/complete`). This is intentional:

- **Single Responsibility**: Each controller has one HTTP method and one concern. This makes it easy to locate the handler for any endpoint.
- **Testability**: Controllers can be unit-tested in isolation by mocking `PrismaService`, `GcsService`, and `PubsubService`.
- **Guard composition**: Different controllers can apply different guard combinations without complex conditional logic within a single controller.

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
Browser ──► Clerk Sign-in ──► JWT issued (RS256, roles from publicMetadata)
   │
   ▼
Browser ──► API Request (Authorization: Bearer <JWT>)
   │
   ▼
JwtGuard ──► Fetch JWKS from Clerk (cached) ──► Verify signature + issuer + audience
   │
   ▼
RolesGuard ──► Read roles claim from JWT payload ──► Match against @Roles() decorator
```

### 6.2 Upload Security

- **Signed resumable URLs**: The API generates GCS resumable session URLs server-side. The client never has direct GCS credentials.
- **Size enforcement**: Role-based file size limits (250MB for pending creators, 2GB for approved).
- **Daily quota**: Pending creators are limited to 5 uploads/day; approved creators to 100.
- **Ownership verification**: Every upload/edit operation verifies `video.uploaderId === user.id`.
- **Completion verification**: `POST /uploads/:id/complete` checks that the GCS object exists and its size matches the declared `sizeBytes`, preventing incomplete upload claims.

### 6.3 Data Privacy

- Pending creators' identity is never exposed publicly (`uploaderVisible = false` until admin approval).
- Analytics viewer identity is hashed, not stored in plaintext.
- IP addresses are SHA-256 hashed before storage.

---

## 7. Observability

### 7.1 Correlation ID Propagation

```
HTTP Request ──► RequestIdMiddleware (x-request-id or UUID) ──► Controller logs
                                                               ──► Pub/Sub message (correlationId)
                                                               ──► Worker ProcessingJob (correlationId)
```

Every log line includes `[requestId]`, enabling trace reconstruction from a single request through the API, message queue, and worker.

### 7.2 Structured Logging

Controllers log entry/exit with structured context:
```
[abc-123] uploads.init { videoId, userSub, uploadsToday, maxUploadsPerDay }
[abc-123] uploads.complete success { uploadIntentId, videoId, objectKey }
```

### 7.3 Job Tracking

The `ProcessingJob` table serves as a persistent job ledger:
- `status`: PENDING → RUNNING → SUCCEEDED/FAILED
- `attempts`, `lastError`: Visible in the admin jobs dashboard
- `startedAt`, `completedAt`: Processing duration metrics

---

## 8. Scalability Considerations

### 8.1 Current Bottlenecks and Mitigation Plans

| Component | Current | Production Plan |
|-----------|---------|-----------------|
| API | Single NestJS process | Cloud Run with auto-scaling (0-N instances) |
| Worker | Single process, sequential | Cloud Run Jobs, one job per video, auto-scale to zero |
| Database | Local PostgreSQL | Cloud SQL with read replicas for public queries |
| Storage | GCS (already scalable) | Add Cloud CDN for renditions and thumbnails |
| Cache | No caching layer yet | Redis (Memorystore) for channels/tags/session data |
| Search | SQL `LIKE` queries | Potential migration to Elasticsearch for full-text + facets |

### 8.2 Why Modular Monolith Now

The NestJS module system (`AuthModule`, `VideosModule`, `ChannelsModule`, etc.) provides logical boundaries that can be extracted into microservices if a specific domain requires independent scaling. The current decision to stay monolithic is based on:

1. **Operational simplicity**: One deployment artifact, one database, one log stream.
2. **Development velocity**: No inter-service contracts to negotiate, no network calls between modules.
3. **Team size**: With a small team, the overhead of distributed systems (service discovery, distributed tracing, saga patterns) would slow development without proportional benefit.

The extraction path is clear: each module already has its own service class, controller, and database queries. Extracting `VideosModule` into a standalone service would require replacing `PrismaService` injection with an API client — the business logic layer wouldn't change.

---

## 9. Infrastructure & Deployment

### 9.1 Local Development

```
docker-compose.yml
├── postgres:15 (port 5432)
└── redis:7 (port 6379)

Auth: Clerk (cloud) — see docs/clerk-setup.md

pnpm dev (concurrently)
├── web: Next.js on :3000
├── api: NestJS on :3001
└── worker: Pub/Sub listener
```

### 9.2 Production Target (GCP)

| Service | GCP Resource | Reasoning |
|---------|-------------|-----------|
| Web (Next.js SSR) | Cloud Run | Serverless containers with auto-scale, pay-per-request |
| API (NestJS) | Cloud Run | Same benefits; CORS configured per environment |
| Worker (FFmpeg) | Cloud Run Jobs | Scale-to-zero between processing; higher memory/CPU for transcoding |
| Database | Cloud SQL (PostgreSQL) | Managed, automated backups, high availability |
| Cache | Memorystore (Redis) | Managed Redis for session/cache, no ops overhead |
| Object Storage | Cloud Storage (3 buckets) | Originals (private), renditions (CDN), thumbnails (CDN) |
| CDN | Cloud CDN + HTTPS LB | Global edge caching for HLS segments and thumbnails |
| Auth | Clerk (managed) | JWT/JWKS for API; invite-only stakeholder onboarding |
| Events | Cloud Pub/Sub | Managed message queue with guaranteed delivery and DLQ |
| Secrets | Secret Manager | No secrets in environment variables or code |
| Monitoring | Cloud Logging + Monitoring | Structured log ingestion, alerting on error rates |

---

## 10. Implementation Progress — Feature Inventory

### Phase 0 — Foundations (Days 1-4)

| Day | Feature | Key Deliverables |
|-----|---------|-----------------|
| 1 | Repo & App Shells | pnpm monorepo, Next.js/NestJS/Worker scaffolds, Docker Compose (Postgres + Redis), `pnpm dev` boots all services |
| 2 | Auth & RBAC | Clerk + JWT template, JWT validation via JWKS (`jose`), `@Roles()` decorator + `RolesGuard`, `GET /me` user sync, role-gated UI areas |
| 3 | Database Baseline | Prisma schema with core entities (`User`, `UserRole`, `CreatorProfile`, `Channel`, `Tag`), migration pipeline, translation tables for i18n, seed data |
| 4 | GCP Infra Blueprint | Environment plan (dev/staging/prod), GCS bucket layout, Pub/Sub topics, Cloud Run targets, Secret Manager strategy |

### Phase 1 — MVP Core (Days 5-12)

End-to-end: upload → process → approve → publish → watch → share.

| Day | Feature | Key Deliverables |
|-----|---------|-----------------|
| 5 | Upload Init | `POST /uploads/init` returns GCS resumable session URL, direct browser-to-GCS upload, `UploadIntent` tracking, role-based size limits (250MB pending / 2GB approved), daily upload quota enforcement |
| 6 | Upload Complete | `POST /uploads/:id/complete` verifies GCS object existence + size match, creates `VideoAsset` record, transitions video to `UPLOADED`, publishes `video.uploaded` event to Pub/Sub, atomic DB transaction |
| 7 | Worker v1: Probe + Thumbs | Worker consumes Pub/Sub, downloads original, runs `ffprobe` for metadata (duration, resolution), generates 6 thumbnails at computed timestamps, uploads to thumbs bucket, writes `VideoThumbnail` rows |
| 8 | Worker v2: HLS Transcode | Single-pass FFmpeg with `filter_complex` producing 360p (800kbps) + 720p (2.8Mbps), HLS packaging (master.m3u8 + variant playlists + 4s mpegts segments), uploads to renditions bucket, `VideoRendition` records, `hls.js` player integration |
| 9 | Moderation Workflow | Creator approval status gates video visibility, `PENDING_APPROVAL` state for unapproved creators, admin endpoints (`approve`/`reject`/`publish`), moderation queue UI, uploader identity hidden until approved |
| 10 | Share Pages + OG Tags | Public route `/v/{slug}` with SSR, Open Graph + Twitter Card metadata (title/desc/thumbnail), social share buttons (WhatsApp/Facebook/X/LinkedIn), copy-to-clipboard for title/tagline/caption |
| 11 | Channels/Tags + Filters | Admin CRUD for channels and tags with translations, creator draft form integration (multi-select channels/tags), public video listing with `?channel=` and `?tag=` filters, locale-aware name resolution with fallback |
| 12 | Stabilization | `PROCESSING_FAILED` status (separated from `REJECTED`), `ProcessingJob` table (status/attempts/error/correlationId), `RequestIdMiddleware` for x-request-id propagation, structured logging, admin jobs dashboard for failed processing |

### Phase 2 — Premium Layer (Days 13-21)

Premium features: drafts, bulk upload, thumbnail picker, visibility modes, scheduled publish, channel pages, search, analytics.

| Day | Feature | Key Deliverables |
|-----|---------|-----------------|
| 13 | Draft Editor | Multi-locale metadata editor (EN/SI/TA tabs), per-locale title/description/tagline/audience fields, channel + tag multi-select by slug, transactional upsert for translations, status-aware editing restrictions, `POST /creator/videos/:id/submit` for moderation submission |
| 14 | Bulk Upload Manager | Multi-file selection queue, parallel upload cap (max 2 concurrent), per-file progress bars via XHR, pause/resume/retry/remove per item, `localStorage` persistence across page refresh, `QUEUED → INITIATING → UPLOADING → COMPLETING → COMPLETED` lifecycle, "Edit Metadata" handoff link on completion |
| 15 | Thumbnail Picker | `ThumbnailSource` enum (AUTO/CUSTOM), thumbnail grid with selection, custom thumbnail upload (multipart, 5MB limit, JPEG/PNG/WebP), single-selection invariant (transaction-based), worker preserves CUSTOM thumbnails on reprocessing, selected thumbnail used in OG tags + share pages |
| 16 | Visibility Modes | `VideoVisibility` enum (PUBLIC/UNLISTED/PRIVATE), `PATCH /creator/videos/:id/visibility`, visibility rules matrix (PUBLIC = listed + accessible, UNLISTED = link-only, PRIVATE = owner/admin only), visibility independent of moderation status, public endpoints enforce `PUBLISHED + PUBLIC` for listings, `PUBLISHED + PUBLIC/UNLISTED` for direct URLs |
| 17 | Scheduled Publishing | `scheduledAt`/`publishedAt`/`scheduleRequested` fields, `PATCH /creator/videos/:id/schedule`, `ScheduledPublisherService` cron (every minute), `updateMany` with guarded WHERE for concurrency safety, admin approval handles overdue schedules (immediate publish), UTC storage + browser-local display |
| 18 | Channel Landing Pages | `GET /channels/:slug` public endpoint, locale-aware channel metadata with fallback, paginated video grid (only `PUBLISHED + PUBLIC`), empty state vs 404 distinction, SEO metadata generation, cross-linking from video cards and share pages |
| 19 | Search + Discovery | `PublicVideosService` with keyword search (PostgreSQL `contains` + `insensitive`), combined filters (`?q=` + `?channel=` + `?tag=`), searches title/description/tagline across requested locale + English, `CreatorVideosQueryService` with status/visibility filters, pagination for both public and creator views, responsive filter UI with active filter chips |
| 20 | Video Analytics | Dual-layer model: `VideoAnalyticsEvent` (raw) + `VideoAnalyticsDaily` (aggregated), `POST /analytics/videos/:id/events` (public, no auth), event types (IMPRESSION/PLAY_START/HEARTBEAT/PLAY_COMPLETE), traffic source attribution (DIRECT/SHARE/CHANNEL/TAG/SEARCH/EXTERNAL), unique viewer detection (SHA-256 hash), completion deduplication (per session/day), denormalized counters on Video record, `PublicVideoPlayer` component with milestone-based instrumentation, `GET /creator/videos/:id/analytics` per-video dashboard |
| 21 | Creator Analytics Overview | `GET /creator/analytics/overview?days=7\|30`, aggregated metrics across all creator videos, totals (views/unique viewers/play starts/completions/completion rate), traffic source breakdown, daily trend series, top 5 videos with thumbnails, locale-aware title fallback, dashboard UI with summary cards + trend list |

### Phase 3 — Distribution + Governance (Days 22–27) ✅

| Day | Feature | Key Deliverables |
|-----|---------|-----------------|
| 22 | Tag Landing Pages | `GET /tags/:slug`, locale-aware metadata + description, paginated `PUBLISHED + PUBLIC` grid, SEO, `?src=tag` analytics |
| 23 | Short Share Links | `ShortLink` model, `POST /creator/videos/:id/share`, `GET /short-links/:code`, web `/s/{code}` redirect with `?src=share` |
| 24 | Embed Player | `GET /public/videos/:slug/embed`, `/[locale]/embed/[slug]` iframe player, `EXTERNAL` analytics, copy-embed UI, CSP for framing |
| 25 | Moderation Improvements | Structured rejection (`rejectionReason`, `rejectionNote`, timestamps), creator rejection panel, admin queue context |
| 26 | Resubmission Flow | `POST /creator/videos/:id/resubmit`, `moderationVersion`, creator resubmit button, admin revision badges |
| 27 | Content Governance | Takedown / archive / restore, `VideoAuditLog`, governance fields, admin + creator UI, public exclusion of governed content |

### Beyond the day plan ✅

| Feature | Key Deliverables |
|---------|-----------------|
| Subtitles | `VideoSubtitle` model, creator upload `.vtt`/`.srt` per locale, player CC |
| Media items | `MediaItem` for `IMAGE` / `DOCUMENT`, parallel upload/moderation/governance at `/upload/media` |
| Taxonomy & tag governance | `Category` / `Subcategory` (+ translations), `Channel.subcategoryId`, `primaryChannelId` on `Video` and `MediaItem`, governed tags with `TagAlias` + merge/block, `/admin/taxonomy` and `/admin/tags` consoles, `/categories` browse routes, `TaxonomyAuditLog` |

---

### Implementation Summary by the Numbers

| Metric | Count |
|--------|-------|
| Development days completed | 27 (+ Day 2.5 i18n) |
| API modules | auth, videos, uploads, admin, public, channels, taxonomy, tags, search, short-links, media, analytics |
| Prisma models | 25+ (including taxonomy hierarchy, governance, subtitles, media, short links) |
| Supported locales | 3 (en, si, ta) |
| Video lifecycle states | 11 |
| HLS renditions | 2 (360p, 720p) |
| Auto-generated thumbnails per video | 6 |

---

## 11. Key Architectural Trade-offs

| Trade-off | Decision | Justification |
|-----------|----------|---------------|
| **Monolith vs Microservices** | Modular monolith | Team size doesn't warrant distributed systems overhead. Module boundaries enable future extraction. |
| **Self-hosted auth vs managed** | Clerk (managed) | Faster onboarding, no IdP ops; roles in publicMetadata; JWKS validation unchanged |
| **Direct GCS upload vs API proxy** | Direct-to-GCS with signed URLs | Eliminates API as a bandwidth bottleneck. Enables multi-GB uploads without server memory pressure. |
| **Pub/Sub vs direct worker call** | Asynchronous via Pub/Sub | Decouples upload completion from processing. Enables retry semantics, DLQ, and independent scaling. |
| **Prisma vs raw SQL** | Prisma ORM | Type safety, auto-generated client, migration management. Accepted trade-off: less control over complex queries. |
| **HLS vs DASH** | HLS (Apple HTTP Live Streaming) | Native Safari support (iOS), wide hls.js compatibility. DASH would require an additional player library for Apple devices. |
| **Daily aggregation vs real-time** | Pre-aggregated daily tables | Avoids expensive `COUNT(*)` on raw events for dashboard queries. Aggregation happens inline during event tracking (transactional upsert). |
| **Enum states vs event sourcing** | Database enums for state machines | Simpler to implement, query, and debug. Event sourcing would be overkill for the current state machine complexity. |
| **Multi-locale translation tables vs JSON columns** | Separate translation tables | Supports locale-aware queries, indexing, and fallback logic in SQL. JSON columns would require application-level extraction. |
| **PostgreSQL LIKE vs full-text search** | SQL `contains` (ILIKE) for now | Correct and fast enough for current catalog size. Clear migration path to `tsvector` or Elasticsearch when scale demands it. |
| **Inline aggregation vs batch jobs** | Transactional upsert on event ingest | Keeps daily summaries always up-to-date without a separate batch scheduler. Trade-off: slightly higher write latency per analytics event. |

---

## 12. What's Built vs What's Remaining

### Completed Capabilities

| Domain | Capability | Phase |
|--------|-----------|-------|
| **Auth & Identity** | Clerk SSO, JWT/JWKS validation, RBAC guards, invite-only sign-up, creator approval sync | 0 |
| **Upload Pipeline** | Direct-to-GCS resumable uploads, pause/resume, role-based size/quota limits, bulk upload manager, upload intent tracking | 0-2 |
| **Video Processing** | FFmpeg worker via Pub/Sub, ffprobe metadata, 6 auto-thumbnails, HLS transcode (360p+720p), idempotent job processing, job failure tracking | 1 |
| **Content Moderation** | 11-state lifecycle FSM, dual approval (creator + content), moderation queue, approve/reject/publish, resubmit with revision tracking, admin backoffice | 1-3 |
| **Social Sharing** | SSR share pages with OG/Twitter metadata, social share buttons, short links, embed player, copy helpers, locale-aware URLs | 1-3 |
| **Taxonomy** | Category → Subcategory → Channel hierarchy with i18n translations, primary-channel classification and breadcrumbs, admin drill-down console with impact preview and unmapped bucket, channel + tag landing pages, `/categories` browse routes | 1-3, post-27 |
| **Tag governance** | Contributor tag creation with canonical normalization, `PENDING` tags for unapproved creators, merge with alias-preserving slugs, block/feature, per-item tag ceiling, `TaxonomyAuditLog` | post-27 |
| **Creator Workflow** | Multi-locale draft editor, thumbnail picker + custom upload, visibility modes, scheduled publishing, subtitles | 2+ |
| **Discovery** | Keyword search + category/subcategory/channel/tag filters, paginated video grids, SEO metadata | 2-3 |
| **Analytics** | Raw event capture + daily aggregation, traffic source attribution, per-video + creator overview dashboards, embed `EXTERNAL` source | 2-3 |
| **Governance** | Takedown / archive / restore, `VideoAuditLog`, governance reasons on video records | 3 |
| **Media items** | IMAGE/DOCUMENT upload path with parallel moderation and governance | post-27 |
| **Observability** | Correlation ID propagation (API → Pub/Sub → Worker), structured logging, processing job ledger, admin jobs dashboard | 1 |
| **Internationalization** | 3 locales (en/si/ta), translation tables, locale-aware API responses, next-intl middleware | 0 |

### Remaining (Phase 4 Roadmap)

| Feature | Priority | Architecture Impact |
|---------|----------|---------------------|
| User management (suspend/disable/quotas UI) | High | Admin UI for user lifecycle, quota overrides, internal notes |
| Reports & abuse flow | High | New `reports` table, report video/user workflow |
| Reprocess / retry / DLQ viewer (enhanced) | Medium | Admin replay for failed jobs; DLQ consumer |
| Rate limiting (production) | Medium | Redis-backed sliding window (`Memorystore`) |
| Embed domain allowlist | Low | Configurable iframe referrer policy |
| Full-text search with facets | Low | PostgreSQL `tsvector` or Elasticsearch/Meilisearch |
| Auto-captions (speech-to-text) | Future | Cloud Speech-to-Text, new worker job type |
| Watch history / Continue watching | Future | `watch_history` table |
| Related/trending videos | Future | Tag/channel similarity, time-windowed views |
| External link ingest (YouTube/Vimeo) | Future | External record + optional import |
| DMCA case management (full workflow) | Future | Case records beyond single-video takedown |

---

## 13. End-to-End User Flows (Implemented)

### Flow 1: Creator Uploads a Video

```
Creator opens Upload page
  → Selects file(s) → Bulk upload queue (max 2 concurrent)
  → Per file: POST /uploads/init → API generates GCS resumable session URL
  → Browser uploads directly to GCS (XHR with Content-Range, progress tracking)
  → POST /uploads/:id/complete → API verifies GCS object + size → creates VideoAsset
  → Pub/Sub event "video.uploaded" published
  → Worker consumes: download → ffprobe → 6 thumbnails → HLS transcode → upload outputs
  → Video status: PROCESSING → PENDING_APPROVAL (or APPROVED if creator pre-approved)
  → Creator edits metadata: multi-locale title/desc/tagline, channels, tags
  → Creator picks thumbnail (auto or custom upload)
  → Creator sets visibility (PUBLIC/UNLISTED/PRIVATE)
  → Creator optionally schedules publish time
  → Creator submits for moderation (if READY)
```

### Flow 2: Admin Moderates Content

```
Admin opens Moderation Queue → GET /admin/moderation/queue
  → Reviews video: metadata, thumbnails, playback
  → Approve → status APPROVED (or PUBLISHED if schedule overdue)
  → Reject → status REJECTED (creator sees reason; can edit and resubmit → PENDING_APPROVAL)
  → Publish → status PUBLISHED (or ScheduledPublisherService auto-publishes at scheduledAt)
  → Takedown / Archive published content → TAKEDOWN / ARCHIVED (audit log entry)
  → Restore governed content → PUBLISHED
```

### Flow 3: Viewer Discovers and Watches

```
Viewer browses:
  → Public video listing (GET /videos?q=&channel=&tag=) → only PUBLISHED + PUBLIC
  → Channel landing page (GET /channels/:slug) → paginated, locale-aware
  → Tag landing page (GET /tags/:slug) → paginated, locale-aware
  → Search with keyword + filters → combined AND logic
  → Clicks video card (link includes ?src=channel|tag|search for attribution)
  → Share page /v/{slug} → SSR with OG/Twitter metadata
  → PublicVideoPlayer loads HLS via hls.js
  → Analytics: PLAY_START fired on first play
  → HEARTBEAT at 25%/50%/75% milestones
  → PLAY_COMPLETE at 90% or video end
  → Events tracked with sessionId, viewerHash, trafficSource
  → Daily aggregates updated transactionally
```

### Flow 4: Creator Reviews Analytics

```
Creator opens Dashboard → GET /creator/analytics/overview?days=30
  → Summary cards: views, unique viewers, completions, completion rate
  → Traffic source breakdown (direct/share/channel/tag/search/external)
  → Daily trend series
  → Top 5 videos with thumbnails
  → Drill into per-video analytics: GET /creator/videos/:id/analytics
```

---

## 14. Summary of Architectural Principles

1. **Mobile-first**: All upload flows use resumable uploads, progress tracking, pause/resume, and bulk queue management for unreliable mobile networks.
2. **Privacy-first**: Pending creators' identities are never exposed. Viewer analytics use SHA-256 hashed identifiers. No PII stored in analytics tables or logs.
3. **Admin-controlled**: All taxonomy (channels, tags), content moderation, user role management, and publishing authority is centralized in the admin console. Creators propose; admins gate.
4. **Event-driven processing**: Upload → Pub/Sub → Worker. No synchronous long-running operations in the API. Idempotent job processing with duplicate detection.
5. **Observable**: Correlation IDs propagated end-to-end (HTTP → Pub/Sub → Worker). Structured logging with request context. Persistent job ledger with admin visibility.
6. **Secure by default**: JWT validation with JWKS (RS256), dual-guard pattern (auth + roles), ownership checks on every mutation, signed GCS upload URLs, role-based quotas.
7. **Incrementally scalable**: Modular monolith with clear extraction boundaries. GCP services (Cloud Run, Pub/Sub, GCS, Cloud SQL) scale independently. Worker designed for Cloud Run Jobs (scale-to-zero).
8. **Locale-aware by design**: Translation tables for all user-facing content (videos, channels, tags). Three-tier fallback chain (requested locale → English → base name). URL-based locale routing via next-intl middleware.
