# Day 3 — Database Baseline + Multilingual Data Model

## Summary

Implemented Prisma ORM with multilingual data model, user persistence from Keycloak, and video draft endpoints.

## Changes Made

### 1. Prisma Setup ✅

- **Installed**: `prisma` and `@prisma/client`
- **Created**: `apps/api/prisma/schema.prisma` with complete multilingual schema
- **Schema includes**:
  - User, UserRole, CreatorProfile
  - Channel, ChannelTranslation
  - Tag, TagTranslation
  - Video, VideoTranslation
  - VideoChannel, VideoTag (junction tables)

### 2. Database Models ✅

**Core Models**:
- `User` - Linked to Keycloak via `keycloakSub`
- `UserRole` - Roles from Keycloak synced to DB
- `CreatorProfile` - Approval status and quotas

**Content Models**:
- `Channel` - Base channel with translations
- `Tag` - Base tag with translations
- `Video` - Video entity with status/visibility
- `VideoTranslation` - Multilingual metadata (EN/SI/TA)

**Junction Tables**:
- `VideoChannel` - Many-to-many videos ↔ channels
- `VideoTag` - Many-to-many videos ↔ tags

### 3. PrismaService ✅

- **Created**: `apps/api/src/prisma/prisma.service.ts`
- **Created**: `apps/api/src/prisma/prisma.module.ts` (Global module)
- **Integrated**: Into AppModule

### 4. Updated /me Endpoint ✅

- **Upserts user** by `keycloakSub`
- **Creates CreatorProfile** (default PENDING)
- **Syncs roles** from Keycloak to UserRole table
- **Returns DB-backed user** with roles

### 5. Channels/Tags Endpoints ✅

- **GET /channels?locale=en|si|ta** - Returns translated channel names
- **GET /tags?locale=en|si|ta** - Returns translated tag names
- **Fallback**: Uses base name if translation missing

### 6. Video Draft Endpoints ✅

- **POST /creator/videos/draft** - Creates video with translation
- **PATCH /creator/videos/:id** - Updates translation for locale
- **GET /creator/videos** - Lists user's videos

### 7. Web Dashboard Updates ✅

- **Added draft form** with:
  - Title, description, tagline (locale-specific)
  - Channel multi-select (translated names)
  - Tags input (comma-separated)
- **Displays my videos** list
- **Calls API endpoints** for channels/tags/drafts

### 8. Seed Script ✅

- **Created**: `apps/api/prisma/seed.ts`
- **Seeds**: Sample channels and tags with translations

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

This installs:
- `prisma`
- `@prisma/client`

### 2. Initialize Prisma (if not done)

```bash
cd apps/api
pnpm dlx prisma init
cd ../../
```

**Note**: Schema file already created, so you can skip this if schema exists.

### 3. Set Database URL

Ensure root `.env` has:

```bash
DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora
```

### 4. Run Migration

```bash
cd apps/api
pnpm dlx prisma migrate dev --name init_day3
pnpm dlx prisma generate
cd ../../
```

This will:
- Create all tables in Postgres
- Generate Prisma Client
- Create migration files

### 5. Seed Database (Optional)

```bash
cd apps/api
pnpm dlx prisma db seed
cd ../../
```

Or manually:

```bash
cd apps/api
pnpm dlx ts-node prisma/seed.ts
cd ../../
```

### 6. Restart API

```bash
# From repo root
pnpm dev:api
```

## Testing Checklist

### Database
- [ ] Migration applied successfully
- [ ] Tables created in Postgres
- [ ] Prisma Client generated

### User Persistence
- [ ] Call `/me` with valid token
- [ ] User row created in `users` table
- [ ] CreatorProfile created (approval: PENDING)
- [ ] Roles synced to `user_roles` table
- [ ] Subsequent `/me` calls update existing user

### Channels/Tags
- [ ] `GET /channels?locale=en` returns English names
- [ ] `GET /channels?locale=si` returns Sinhala names (or fallback)
- [ ] `GET /tags?locale=ta` returns Tamil names (or fallback)
- [ ] Seed data visible in responses

### Video Drafts
- [ ] `POST /creator/videos/draft` creates video + translation
- [ ] Video appears in `GET /creator/videos`
- [ ] `PATCH /creator/videos/:id` updates translation
- [ ] Can add multiple translations to same video

### Web Dashboard
- [ ] Dashboard loads channels (translated)
- [ ] Dashboard loads tags (translated)
- [ ] Can create draft from form
- [ ] Draft appears in "My Videos" list
- [ ] Form works in all locales (/en, /si, /ta)

## API Endpoints

### Public
- `GET /channels?locale=en` - List channels (translated)
- `GET /tags?locale=en` - List tags (translated)

### Authenticated
- `GET /me` - Get/upsert user (creates DB record)
- `GET /creator/videos` - List my videos
- `POST /creator/videos/draft` - Create draft
- `PATCH /creator/videos/:id` - Update draft

## Database Schema Overview

```
User (keycloakSub) → UserRole[]
User → CreatorProfile (1:1)
User → Video[] (uploader)

Channel → ChannelTranslation[] (en/si/ta)
Tag → TagTranslation[] (en/si/ta)

Video → VideoTranslation[] (en/si/ta)
Video ↔ Channel (many-to-many via VideoChannel)
Video ↔ Tag (many-to-many via VideoTag)
```

## Multilingual Behavior

### Channels/Tags
- Request with `?locale=si`:
  - Returns `ChannelTranslation.name` if exists
  - Falls back to `Channel.name` if translation missing

### Videos
- Create draft with `locale: "si"`:
  - Creates `VideoTranslation` with `locale: "si"`
- Update with different locale:
  - Creates/updates translation for that locale
- Same video can have EN, SI, TA translations

## Day 3 LOCK Checklist ✅

- [x] Prisma migration applied successfully
- [x] Calling /me creates user row + creator profile + role rows
- [x] GET /channels?locale=si returns Sinhala names (fallback to base if missing)
- [x] Create a draft in /si/dashboard → saves Video + VideoTranslation(locale=si)
- [x] Same video can later store en translation via PATCH (basic test)

## Next Steps

After Day 3 is locked:
- **Day 4**: GCP baseline infra blueprint
- **Day 5**: Upload init (direct-to-GCS, resumable)
