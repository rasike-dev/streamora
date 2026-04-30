# Streamora — Comprehensive Test Plan

> **Platform**: GCP Self-Managed Video Uploading Platform  
> **Version**: Phase 0–3 complete (30 development days)  
> **Date**: March 12, 2026

---

## Table of Contents

1. [Environment Setup & Prerequisites](#1-environment-setup--prerequisites)
2. [Test Data Insertion Guide](#2-test-data-insertion-guide)
3. [API Testing — All User Flows](#3-api-testing--all-user-flows)
4. [Web Interface Testing — All User Flows](#4-web-interface-testing--all-user-flows)
5. [Security & Edge Case Tests](#5-security--edge-case-tests)
6. [Complete Endpoint Reference](#6-complete-endpoint-reference)

---

## 1. Environment Setup & Prerequisites

### 1.1 Start Infrastructure

```bash
# Start Postgres, Redis, and Keycloak
docker compose up -d

# Verify containers are running
docker compose ps
```

Expected: Three containers running — `postgres:15` (port 5432), `redis:7` (port 6379), `keycloak:24` (port 8080).

### 1.2 Run Database Migrations

```bash
cd apps/api
npx prisma migrate dev
```

Expected: All migrations applied successfully. Tables created in PostgreSQL.

### 1.3 Start All Services

```bash
# From the root of the monorepo
pnpm dev
```

Expected:
- **Web (Next.js)**: `http://localhost:3000`
- **API (NestJS)**: `http://localhost:3001`
- **Worker**: Pub/Sub listener active

### 1.4 Verify Services Are Running

```bash
# API health check
curl http://localhost:3001/health
# Expected: { "status": "ok", "timestamp": "..." }

# API readiness check (includes DB probe)
curl http://localhost:3001/ready
# Expected: { "status": "ready", "db": "ok", "ready": true }

# Web app
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/en
# Expected: 200
```

### 1.5 Keycloak Setup

Open `http://localhost:8080` and log into the Keycloak admin console.

You will need to create the following users and realm roles in Keycloak:

| User | Realm Roles | Purpose |
|------|------------|---------|
| `creator-pending` | `CREATOR_PENDING` | A new creator awaiting approval |
| `creator-approved` | `CREATOR_APPROVED` | An approved creator who can bypass moderation |
| `admin-user` | `ADMIN` | Full admin access |
| `moderator-user` | `MODERATOR` | Moderation access |
| `viewer-user` | *(no special roles)* | Basic viewer / anonymous testing baseline |

**Keycloak Realm Role Setup:**
1. Go to **Realm Settings** > **Realm Roles**
2. Create roles: `ADMIN`, `MODERATOR`, `CREATOR_PENDING`, `CREATOR_APPROVED`
3. Assign roles to users via **Users** > select user > **Role Mappings**

### 1.6 Environment Variables

Ensure these are set in `apps/api/.env` (or root `.env`):

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/streamora
KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
GCS_BUCKET_ORIGINALS=streamora-originals-dev
GCS_BUCKET_RENDITIONS=streamora-renditions-dev
GCS_BUCKET_THUMBS=streamora-thumbs-dev
PUBSUB_TOPIC_VIDEO_UPLOADED=video-uploaded-dev
ALLOWED_ORIGINS=http://localhost:3000
```

Ensure these are set in `apps/web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_KEYCLOAK_ISSUER=http://localhost:8080/realms/streamora
NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=streamora-web
```

### 1.7 Obtain JWT Tokens

After logging in via Keycloak, retrieve the `access_token` from `localStorage` in the browser developer tools. For API-only testing, use the Keycloak token endpoint:

```bash
# Get token for a user (password grant — dev only)
curl -X POST http://localhost:8080/realms/streamora/protocol/openid-connect/token \
  -d "client_id=streamora-web" \
  -d "username=creator-pending" \
  -d "password=<password>" \
  -d "grant_type=password"
```

Save the tokens as shell variables for subsequent API tests:

```bash
export CREATOR_TOKEN="<paste access_token here>"
export ADMIN_TOKEN="<paste admin access_token here>"
```

---

## 2. Test Data Insertion Guide

Before testing the full flows, seed the system with baseline data. Execute these steps in order.

### 2.1 Sync Test Users (Call `/me` for Each)

Each Keycloak user must call `/me` once to create their local DB records.

```bash
# Sync the pending creator
curl -s http://localhost:3001/me \
  -H "Authorization: Bearer $CREATOR_TOKEN" | jq .
# Save the returned "id" as CREATOR_USER_ID

# Sync the admin user
curl -s http://localhost:3001/me \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq .
# Save the returned "id" as ADMIN_USER_ID
```

**Verify in DB:**
- `User` table: rows for each synced user
- `CreatorProfile` table: each user has a profile with `approval: PENDING`
- `UserRole` table: roles match Keycloak's `realm_access.roles`

### 2.2 Create Channels (Admin)

```bash
# Channel 1: Education
curl -X POST http://localhost:3001/admin/channels \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Education",
    "slug": "education",
    "sortOrder": 1,
    "translations": [
      { "locale": "en", "name": "Education", "description": "Educational videos and tutorials" },
      { "locale": "si", "name": "අධ්‍යාපනය", "description": "අධ්‍යාපනික වීඩියෝ" },
      { "locale": "ta", "name": "கல்வி", "description": "கல்வி வீடியோக்கள்" }
    ]
  }'

# Channel 2: Entertainment
curl -X POST http://localhost:3001/admin/channels \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Entertainment",
    "slug": "entertainment",
    "sortOrder": 2,
    "translations": [
      { "locale": "en", "name": "Entertainment", "description": "Fun and entertainment content" },
      { "locale": "si", "name": "විනෝදාස්වාදය" },
      { "locale": "ta", "name": "பொழுதுபோக்கு" }
    ]
  }'

# Channel 3: News
curl -X POST http://localhost:3001/admin/channels \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "News",
    "slug": "news",
    "sortOrder": 3,
    "translations": [
      { "locale": "en", "name": "News", "description": "Latest news and updates" }
    ]
  }'
```

**Verify in DB:** 3 `Channel` rows + corresponding `ChannelTranslation` rows.

### 2.3 Create Tags (Admin)

```bash
# Tag 1: Science
curl -X POST http://localhost:3001/admin/tags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Science",
    "slug": "science",
    "preferred": true,
    "translations": [
      { "locale": "en", "name": "Science" },
      { "locale": "si", "name": "විද්‍යාව" },
      { "locale": "ta", "name": "அறிவியல்" }
    ]
  }'

# Tag 2: Technology
curl -X POST http://localhost:3001/admin/tags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technology",
    "slug": "technology",
    "preferred": true,
    "translations": [
      { "locale": "en", "name": "Technology" },
      { "locale": "si", "name": "තාක්ෂණය" }
    ]
  }'

# Tag 3: History
curl -X POST http://localhost:3001/admin/tags \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "History",
    "slug": "history",
    "preferred": false,
    "translations": [
      { "locale": "en", "name": "History" }
    ]
  }'
```

**Verify in DB:** 3 `Tag` rows + corresponding `TagTranslation` rows.

### 2.4 Approve a Creator (Admin)

For testing the "approved creator" path (videos skip moderation), approve one creator:

```bash
curl -X POST http://localhost:3001/admin/users/$CREATOR_USER_ID/creator-approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

**Verify in DB:**
- `CreatorProfile.approval` = `APPROVED` for that user
- All their videos get `uploaderVisible: true`

> **Note:** Keep the `creator-pending` user unapproved to test the pending-creator flow separately.

### 2.5 Test Data Summary

After completing the above, the system should contain:

| Entity | Count | Details |
|--------|-------|---------|
| Users | 2+ | At least one pending creator + one admin |
| CreatorProfiles | 2+ | One PENDING, one APPROVED |
| Channels | 3 | education, entertainment, news |
| Tags | 3 | science, technology, history |
| Videos | 0 | Ready to test upload flows |

---

## 3. API Testing — All User Flows

### FLOW 1: Authentication & User Sync

**Actor**: Any user  
**Data required**: Keycloak user account

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Call `/me` with valid JWT | `curl http://localhost:3001/me -H "Authorization: Bearer $TOKEN"` | Returns `{ id, sub, username, email, roles }`. User + CreatorProfile + UserRole rows created in DB. |
| 2 | Call `/me` again (idempotent) | Same command | Same response. No duplicate rows. |
| 3 | Call `/me` without JWT | `curl http://localhost:3001/me` | `401 Unauthorized` |
| 4 | Call admin endpoint with creator token | `curl http://localhost:3001/admin/ping -H "Authorization: Bearer $CREATOR_TOKEN"` | `403 Forbidden` |
| 5 | Call admin endpoint with admin token | `curl http://localhost:3001/admin/ping -H "Authorization: Bearer $ADMIN_TOKEN"` | `{ "ok": true, "scope": "admin" }` |

---

### FLOW 2: Taxonomy Management (Channels & Tags)

**Actor**: Admin  
**Data required**: Admin JWT, channel/tag data from Section 2

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Create channel | See Section 2.2 | Channel + translations created |
| 2 | Update channel | `curl -X PATCH http://localhost:3001/admin/channels/<ID> -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"isActive":false}'` | Channel deactivated |
| 3 | Update channel translation | `curl -X PATCH http://localhost:3001/admin/channels/<ID> -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"translations":[{"locale":"ta","name":"புதிய பெயர்","description":"Updated Tamil desc"}]}'` | Translation upserted |
| 4 | Create tag | See Section 2.3 | Tag + translations created |
| 5 | Update tag | `curl -X PATCH http://localhost:3001/admin/tags/<ID> -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"preferred":false}'` | Tag updated |
| 6 | Non-admin creates channel | Same POST with `$CREATOR_TOKEN` | `403 Forbidden` |

---

### FLOW 3: Video Upload Pipeline

**Actor**: Creator  
**Data required**: Creator JWT, a test `.mp4` video file (< 250MB for pending creator)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Create video draft | `curl -X POST http://localhost:3001/creator/videos/draft -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{}'` | `{ id: "<VIDEO_ID>", slug: "<SLUG>", status: "DRAFT" }` |
| 2 | Check upload limits | `curl http://localhost:3001/uploads/limits -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns `maxBytes`, `allowedTypes` based on role |
| 3 | Init upload | `curl -X POST http://localhost:3001/uploads/init -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"videoId":"<VIDEO_ID>","filename":"test.mp4","contentType":"video/mp4","sizeBytes":10485760}'` | Returns `uploadIntentId`, `resumableSessionUrl`, `objectKey` |
| 4 | Report progress | `curl -X POST http://localhost:3001/uploads/<INTENT_ID>/progress -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"uploadedBytes":5242880,"status":"UPLOADING"}'` | `{ "ok": true }` |
| 5 | Check upload status | `curl http://localhost:3001/uploads/<INTENT_ID>/status -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns `{ status, percent, uploadedBytes, ... }` |
| 6 | Complete upload | `curl -X POST http://localhost:3001/uploads/<INTENT_ID>/complete -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns `{ ok, videoId, uploadIntentId }`. Video status → `UPLOADED`. Pub/Sub event published. |
| 7 | List active uploads | `curl http://localhost:3001/creator/uploads -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns list of non-completed upload intents |
| 8 | Report upload failure | `curl -X POST http://localhost:3001/uploads/<INTENT_ID>/fail -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"error":"Network error","uploadedBytes":1000}'` | Intent status → `FAILED`, `lastError` saved |
| 9 | Resume upload (re-init) | Same as step 3 but add `"uploadIntentId":"<EXISTING_ID>"` | Reuses same `objectKey`, intent reset to `INITIATED` |

**Size/quota edge cases:**

| Test | Command Variation | Expected |
|------|-------------------|----------|
| File too large (pending) | `sizeBytes: 300000000` (300MB) | `400 File too large for your role` |
| File too large (approved) | `sizeBytes: 3000000000` (3GB) | `400 File too large for your role` |
| 6th upload for pending | Init 6th upload in same day | `400 Daily upload limit reached (5)` |
| Different user's video | Use a different user's `videoId` | `400 Not owner of this video` |

---

### FLOW 4: Video Processing (Worker)

**Actor**: System (automated after upload completion)  
**Data required**: A successfully completed upload

| Step | What Happens | How to Verify |
|------|-------------|---------------|
| 1 | Worker consumes Pub/Sub message | Check worker terminal output for `[correlationId] processing started` |
| 2 | Worker downloads original from GCS | Worker log: `downloaded original` |
| 3 | ffprobe extracts metadata | DB: `VideoAsset.durationSec`, `width`, `height` populated |
| 4 | 6 thumbnails generated | DB: 6 `VideoThumbnail` rows (source=AUTO), first one `isSelected=true` |
| 5 | HLS transcode (360p + 720p) | DB: 2 `VideoRendition` rows, `VideoAsset.hlsBucket` + `hlsMasterKey` set |
| 6 | Status transition | If creator PENDING → Video status = `PENDING_APPROVAL`; If creator APPROVED → Video status = `APPROVED` |
| 7 | ProcessingJob record | DB: `ProcessingJob` with status `SUCCEEDED`, `correlationId` matches |

**Failure path testing:**
- Upload a corrupt/empty file → Worker fails → `ProcessingJob.status = FAILED`, `lastError` populated, Video status = `PROCESSING_FAILED`

---

### FLOW 5: Video Metadata Editing

**Actor**: Creator  
**Data required**: Creator JWT, a video in editable status (DRAFT, READY, or REJECTED)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Update with multi-locale translations | `curl -X PATCH http://localhost:3001/creator/videos/<ID> -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"translations":[{"locale":"en","title":"My Video","description":"A great video","tagline":"Watch this","audience":"GENERAL"},{"locale":"si","title":"මගේ වීඩියෝව"}],"channels":["education"],"tags":["science","technology"]}'` | `VideoTranslation` rows upserted. `VideoChannel` + `VideoTag` join rows created. |
| 2 | Get video draft | `curl http://localhost:3001/creator/videos/<ID> -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns full video with translations, channels, tags, thumbnails, moderation fields |
| 3 | List my videos | `curl "http://localhost:3001/creator/videos?locale=en&page=1" -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns paginated list of own videos only |
| 4 | Filter by status | `curl "http://localhost:3001/creator/videos?status=DRAFT" -H "Authorization: Bearer $CREATOR_TOKEN"` | Only DRAFT videos returned |
| 5 | Search my videos | `curl "http://localhost:3001/creator/videos?q=great" -H "Authorization: Bearer $CREATOR_TOKEN"` | Videos matching keyword returned |
| 6 | Edit non-editable video | PATCH a PUBLISHED video | Error: not editable in current status |
| 7 | Edit another creator's video | Use wrong video ID | Ownership error |

---

### FLOW 6: Thumbnail Management

**Actor**: Creator  
**Data required**: Creator JWT, a video that has completed processing (6 auto-thumbnails exist)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | List thumbnails | `curl http://localhost:3001/creator/videos/<ID>/thumbnails -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns 6 AUTO thumbnails, one `isSelected: true` |
| 2 | Select different thumbnail | `curl -X POST http://localhost:3001/creator/videos/<ID>/thumbnails/<THUMB_ID>/select -H "Authorization: Bearer $CREATOR_TOKEN"` | Old thumb deselected, new one selected |
| 3 | Upload custom thumbnail | `curl -X POST http://localhost:3001/creator/videos/<ID>/thumbnails/upload -H "Authorization: Bearer $CREATOR_TOKEN" -F "file=@thumb.jpg"` | CUSTOM thumbnail created, auto-selected. Max 5MB. |
| 4 | Upload non-image file | Use `.pdf` file | Error: invalid file type |
| 5 | Upload oversized thumbnail | Use > 5MB image | Error: file too large |

---

### FLOW 7: Subtitle Management

**Actor**: Creator  
**Data required**: Creator JWT, a video in editable status, `.vtt` or `.srt` subtitle files

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Upload English subtitle | `curl -X POST http://localhost:3001/creator/videos/<ID>/subtitles -H "Authorization: Bearer $CREATOR_TOKEN" -F "file=@captions-en.vtt" -F "locale=en"` | `VideoSubtitle` row created, file in GCS |
| 2 | Upload Sinhala subtitle | Same with `-F "locale=si"` and a different file | Second subtitle row created |
| 3 | List subtitles | `curl http://localhost:3001/creator/videos/<ID>/subtitles -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns 2 tracks with locale, format, URL |
| 4 | Replace existing subtitle | Upload again with same locale | File replaced, row updated |
| 5 | Delete subtitle | `curl -X DELETE http://localhost:3001/creator/videos/<ID>/subtitles/en -H "Authorization: Bearer $CREATOR_TOKEN"` | Subtitle row deleted, GCS file removed |
| 6 | Upload without locale | Omit `-F "locale=..."` | `400 Locale is required` |
| 7 | Upload > 1MB file | Use large subtitle file | Error: file too large |
| 8 | Upload non-VTT/SRT | Use `.txt` file | Error: invalid format |

---

### FLOW 8: Visibility & Scheduling

**Actor**: Creator  
**Data required**: Creator JWT, a video in editable status

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Set PUBLIC | `curl -X PATCH http://localhost:3001/creator/videos/<ID>/visibility -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"visibility":"PUBLIC"}'` | `Video.visibility = PUBLIC` |
| 2 | Set UNLISTED | Same with `"UNLISTED"` | Accessible by direct link, excluded from listings |
| 3 | Set PRIVATE | Same with `"PRIVATE"` | Owner/admin access only |
| 4 | Schedule publish | `curl -X PATCH http://localhost:3001/creator/videos/<ID>/schedule -H "Authorization: Bearer $CREATOR_TOKEN" -H "Content-Type: application/json" -d '{"scheduledAt":"2026-03-15T10:00:00.000Z"}'` | `Video.scheduledAt` and `scheduleRequested: true` set |
| 5 | Schedule in the past + approved | Set `scheduledAt` to past, then admin approves | Immediate publish (admin approve handles overdue) |
| 6 | Cron auto-publish | Wait for ScheduledPublisherService cron (every minute) | APPROVED + scheduleRequested + scheduledAt <= now → PUBLISHED |

---

### FLOW 9: Moderation Submission

**Actor**: Creator  
**Data required**: Creator JWT, a video in READY status

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Submit for moderation | `curl -X POST http://localhost:3001/creator/videos/<ID>/submit -H "Authorization: Bearer $CREATOR_TOKEN"` | Status → `PENDING_APPROVAL` |
| 2 | Submit non-READY video | Submit a DRAFT video | Error: invalid status for submission |

---

### FLOW 10: Admin Moderation

**Actor**: Admin / Moderator  
**Data required**: Admin JWT, videos in various statuses (at least one in PENDING_APPROVAL)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | View moderation queue | `curl "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL" -H "Authorization: Bearer $ADMIN_TOKEN"` | List of pending videos with title, uploader, moderationVersion |
| 2 | Filter by status | Change `?status=REJECTED`, `APPROVED`, `PUBLISHED`, `TAKEDOWN`, `ARCHIVED` | Filtered results |
| 3 | Approve video | `curl -X POST http://localhost:3001/admin/videos/<ID>/approve -H "Authorization: Bearer $ADMIN_TOKEN"` | Status → `APPROVED` (or `PUBLISHED` if scheduled and overdue) |
| 4 | Reject video | `curl -X POST http://localhost:3001/admin/videos/<ID>/reject -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"reason":"Low quality audio","note":"Please re-record with better microphone"}'` | Status → `REJECTED`. `rejectionReason`, `rejectionNote`, `rejectedAt`, `rejectedBy` set. |
| 5 | Reject without reason | Omit `reason` field | `400 Rejection reason is required` |
| 6 | Reject non-pending video | Reject a PUBLISHED video | `400 Only pending videos can be rejected` |
| 7 | Publish approved video | `curl -X POST http://localhost:3001/admin/videos/<ID>/publish -H "Authorization: Bearer $ADMIN_TOKEN"` | Status → `PUBLISHED`, visibility → `PUBLIC` |
| 8 | Non-admin moderates | Use `$CREATOR_TOKEN` | `403 Forbidden` |

---

### FLOW 11: Resubmission After Rejection

**Actor**: Creator  
**Data required**: Creator JWT, a video in REJECTED status (created in Flow 10 Step 4)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | View rejection feedback | `curl http://localhost:3001/creator/videos/<ID> -H "Authorization: Bearer $CREATOR_TOKEN"` | Response includes `rejectionReason`, `rejectionNote` |
| 2 | Edit metadata (fix issues) | PATCH the video with updated content | Translations updated |
| 3 | Resubmit | `curl -X POST http://localhost:3001/creator/videos/<ID>/resubmit -H "Authorization: Bearer $CREATOR_TOKEN"` | Status → `PENDING_APPROVAL`. `moderationVersion` incremented. `resubmittedAt` set. |
| 4 | Resubmit non-REJECTED video | Try resubmitting a DRAFT video | Error: only rejected videos can be resubmitted |
| 5 | Admin sees resubmission | Check moderation queue | Video shows updated `moderationVersion` and `resubmittedAt` |

---

### FLOW 12: Creator Approval

**Actor**: Admin  
**Data required**: Admin JWT, user ID of a pending creator

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Approve creator | `curl -X POST http://localhost:3001/admin/users/<USER_ID>/creator-approve -H "Authorization: Bearer $ADMIN_TOKEN"` | `CreatorProfile.approval = APPROVED`. All their videos: `uploaderVisible = true`. |
| 2 | Reject creator | `curl -X POST http://localhost:3001/admin/users/<USER_ID>/creator-reject -H "Authorization: Bearer $ADMIN_TOKEN"` | `CreatorProfile.approval = REJECTED` |
| 3 | Add notes | `curl -X POST http://localhost:3001/admin/users/<USER_ID>/notes -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"notes":"Verified educator, approved for education channel"}'` | `CreatorProfile.notes` updated (max 2000 chars) |
| 4 | Approved creator's next upload | Upload + complete as approved creator | After processing, video status → `APPROVED` (skips PENDING_APPROVAL) |

---

### FLOW 13: Content Governance

**Actor**: Admin / Moderator  
**Data required**: Admin JWT, a video in PUBLISHED status

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Takedown video | `curl -X POST http://localhost:3001/admin/videos/<ID>/takedown -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"reason":"DMCA complaint","note":"Takedown notice from copyright holder"}'` | Status → `TAKEDOWN`. Governance fields populated. `VideoAuditLog` entry created. |
| 2 | Verify public exclusion | `curl http://localhost:3001/videos?locale=en` | Taken-down video NOT in results |
| 3 | Archive video | `curl -X POST http://localhost:3001/admin/videos/<ID>/archive -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"reason":"Outdated content"}'` | Status → `ARCHIVED`. Audit log entry. |
| 4 | Restore video | `curl -X POST http://localhost:3001/admin/videos/<ID>/restore -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" -d '{"note":"Copyright issue resolved"}'` | Status → `PUBLISHED`. Audit log entry. |
| 5 | Verify restored video is public | `curl http://localhost:3001/videos?locale=en` | Restored video appears in results |

---

### FLOW 14: Public Video Discovery

**Actor**: Anonymous viewer  
**Data required**: At least one PUBLISHED + PUBLIC video (created via Flows 3–10)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | List public videos | `curl "http://localhost:3001/videos?locale=en&page=1&pageSize=12"` | Only `PUBLISHED + PUBLIC` videos. Paginated. |
| 2 | Search by keyword | `curl "http://localhost:3001/videos?q=education&locale=en"` | Matching videos (searches title/description/tagline) |
| 3 | Filter by channel | `curl "http://localhost:3001/videos?channel=education&locale=en"` | Only videos in "education" channel |
| 4 | Filter by tag | `curl "http://localhost:3001/videos?tag=science&locale=en"` | Only videos tagged "science" |
| 5 | Combined search + filter | `curl "http://localhost:3001/videos?q=tutorial&channel=education&tag=science&locale=en"` | AND logic: matches all criteria |
| 6 | Channel landing page | `curl "http://localhost:3001/channels/education?locale=en"` | Channel metadata + paginated video grid |
| 7 | Tag landing page | `curl "http://localhost:3001/tags/science?locale=en"` | Tag metadata + paginated video grid |
| 8 | Non-existent channel | `curl "http://localhost:3001/channels/nonexistent"` | `404 Not Found` |
| 9 | Video share page | `curl "http://localhost:3001/public/videos/<SLUG>?locale=en"` | Full video data with playback URL, thumbnail URL, channels, tags, subtitles |
| 10 | PRIVATE video share page | Access a PRIVATE video's slug | `404 Not Found` |
| 11 | UNLISTED video share page | Access an UNLISTED video's slug | Returns video data (accessible by direct link) |
| 12 | Playback URL | `curl "http://localhost:3001/videos/<VIDEO_ID>/playback"` | Returns `{ masterUrl, thumbUrl }` |
| 13 | Embed data | `curl "http://localhost:3001/videos/<SLUG>/embed?locale=en"` | Returns embeddable video data, only PUBLISHED + PUBLIC |
| 14 | Locale fallback | `curl "http://localhost:3001/public/videos/<SLUG>?locale=ta"` | Falls back to English if Tamil translation missing |

---

### FLOW 15: Short Share Links

**Actor**: Creator (create), Anonymous (resolve)  
**Data required**: Creator JWT, a PUBLISHED video

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Create short link | `curl -X POST http://localhost:3001/videos/<VIDEO_ID>/share -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns `{ code, ... }`. `ShortLink` row created. |
| 2 | Create again (idempotent) | Same command | Returns same `code` |
| 3 | Resolve short link | `curl "http://localhost:3001/short-links/<CODE>"` | Returns redirect URL with `?src=share` |
| 4 | Resolve invalid code | `curl "http://localhost:3001/short-links/INVALID"` | `404 Not Found` |

---

### FLOW 16: Analytics Tracking

**Actor**: Anonymous viewer  
**Data required**: A PUBLISHED video ID

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Track impression | `curl -X POST http://localhost:3001/analytics/videos/<ID>/events -H "Content-Type: application/json" -d '{"eventType":"IMPRESSION","sessionId":"test-session-1","trafficSource":"DIRECT"}'` | `VideoAnalyticsEvent` row created |
| 2 | Track play start | Same with `"eventType":"PLAY_START","positionSeconds":0` | Event row + `VideoAnalyticsDaily` updated |
| 3 | Track heartbeat (50%) | `"eventType":"HEARTBEAT","progressPercent":50,"positionSeconds":120,"durationSeconds":240` | Event row created |
| 4 | Track completion | `"eventType":"PLAY_COMPLETE","progressPercent":100` | Event row + daily completions incremented + `Video.analyticsCompletions` incremented |
| 5 | Verify daily aggregate | Check DB: `VideoAnalyticsDaily` | `views`, `playStarts`, `completions` incremented for today's date |
| 6 | Verify denormalized counters | Check DB: `Video.analyticsViews` | Counter matches daily aggregate total |
| 7 | Rate limit test | Send > 60 analytics events in 1 minute | `429 Too Many Requests` after limit |

---

### FLOW 17: Creator Analytics

**Actor**: Creator  
**Data required**: Creator JWT, a video with analytics data (from Flow 16)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | Overview (30 days) | `curl "http://localhost:3001/creator/analytics/overview?days=30" -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns totals, trafficSources, dailyTrend, topVideos |
| 2 | Overview (7 days) | Same with `?days=7` | Narrower time range |
| 3 | Per-video analytics | `curl "http://localhost:3001/creator/videos/<ID>/analytics?days=30" -H "Authorization: Bearer $CREATOR_TOKEN"` | Returns video-specific totals, traffic sources, daily series |
| 4 | Another creator's video | Use different creator's video ID | Error: ownership check |

---

### FLOW 18: Admin Jobs Dashboard

**Actor**: Admin  
**Data required**: Admin JWT (if testing failures, a corrupt upload that caused processing to fail)

| Step | Action | Command | Expected Result |
|------|--------|---------|-----------------|
| 1 | List failed jobs | `curl "http://localhost:3001/admin/jobs?status=FAILED" -H "Authorization: Bearer $ADMIN_TOKEN"` | List with `lastError`, `attempts`, `correlationId` |
| 2 | List succeeded jobs | `curl "http://localhost:3001/admin/jobs?status=SUCCEEDED" -H "Authorization: Bearer $ADMIN_TOKEN"` | Completed jobs list |
| 3 | Non-admin access | Same with `$CREATOR_TOKEN` | `403 Forbidden` |

---

## 4. Web Interface Testing — All User Flows

This section provides step-by-step testing through the browser at `http://localhost:3000`.

### Prerequisites for UI Testing

Before testing through the web interface, ensure all data from Section 2 is inserted:
- 2+ users synced (one pending creator, one admin)
- 3 channels created (education, entertainment, news)
- 3 tags created (science, technology, history)
- At least one creator approved (for approved-creator flow)

---

### UI-FLOW 1: Landing Page & Navigation

**URL**: `http://localhost:3000/en`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open the URL in browser | Landing page loads. Title "Streamora" visible. Links to Login, Dashboard, Upload, Admin. |
| 2 | Click "Login" link | Navigates to `/en/login` |
| 3 | Click "Dashboard" link | Navigates to `/en/dashboard` (requires login) |
| 4 | Click "Upload Video" link | Navigates to `/en/upload` (requires login) |
| 5 | Click "Admin" link | Navigates to `/en/admin` (requires admin role) |
| 6 | Toggle dark/light mode | Theme toggle switches appearance |

---

### UI-FLOW 2: Login via Keycloak

**URL**: `http://localhost:3000/en/login`

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open login page | "Sign in via Keycloak" message shown. Login button visible. |
| 2 | Click login button | Browser redirects to Keycloak login form at `localhost:8080` |
| 3 | Enter credentials for `creator-pending` | Keycloak authenticates and redirects back |
| 4 | Verify callback | Redirected to `/en/auth/callback`. Token stored in `localStorage` as `access_token`. |
| 5 | Verify user sync | Open browser DevTools > Network tab: `/me` called automatically. Response shows user data with roles. |
| 6 | Login as `admin-user` | Repeat steps 2–5 with admin credentials. `roles` includes `ADMIN`. |

---

### UI-FLOW 3: Public Video Browsing (No Login Required)

**URL**: `http://localhost:3000/en/videos`  
**Data required**: At least one PUBLISHED + PUBLIC video

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open videos page | "Discover Videos" heading shown. Search form with keyword, channel slug, and tag slug inputs. |
| 2 | Verify video grid | Published videos shown in responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop). Each card shows thumbnail, title, tagline, channel badges. |
| 3 | Enter "education" in search box, click Search | URL updates to `?q=education`. Matching videos shown. Active filter chip "q: education" appears. |
| 4 | Enter "education" in Channel slug input, click Search | URL updates to `?channel=education`. Videos from that channel shown. |
| 5 | Enter "science" in Tag slug input, click Search | URL updates to `?tag=science`. Videos with that tag shown. |
| 6 | Combine all three filters | URL: `?q=tutorial&channel=education&tag=science`. Results match ALL criteria. |
| 7 | Click "Clear" button | All filters removed, full listing shown |
| 8 | Verify pagination | If > 12 videos, "Page 1 of N" shown with Previous/Next buttons |
| 9 | Click Next | Page 2 loads. URL updates to `?page=2`. |
| 10 | Empty results | Search for nonexistent term | "No videos matched" message with helpful hint |
| 11 | Click a video card | Navigates to `/en/v/<slug>?src=search` |

---

### UI-FLOW 4: Video Share/Watch Page

**URL**: `http://localhost:3000/en/v/<slug>`  
**Data required**: A PUBLISHED + PUBLIC video with completed processing, metadata, and thumbnail

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open video share page | Video title, tagline displayed. Player component visible with poster image. |
| 2 | Verify uploader name | If creator APPROVED + `uploaderVisible=true`: "By <name>" shown. If pending: no uploader shown. |
| 3 | Play video | Click play button. HLS stream loads via hls.js. Video plays with adaptive bitrate. |
| 4 | Verify subtitles | If subtitles uploaded, CC button available in player. Clicking shows captions. |
| 5 | Verify description | Description section visible below player. |
| 6 | Verify share buttons | "Share" section with WhatsApp, Facebook, X, LinkedIn buttons. |
| 7 | Click WhatsApp | Opens WhatsApp share URL with video title and link |
| 8 | Click "Copy Title" | Title copied to clipboard. "Copied title" confirmation shown. |
| 9 | Click "Copy Tagline" | Tagline copied |
| 10 | Click "Copy Caption" | Full caption (title + tagline + description + URL) copied |
| 11 | Verify embed code button | "Copy Embed Code" button present. Clicking copies `<iframe>` HTML. |
| 12 | Verify metadata section | Channels shown as clickable links. Tags shown. |
| 13 | Click channel link | Navigates to `/en/channels/<slug>` |
| 14 | View page source (SSR check) | Right-click > View Page Source. Verify `<meta property="og:title">`, `<meta property="og:image">`, `<meta name="twitter:card">` present with correct values. |
| 15 | Access PRIVATE video | Navigate to a PRIVATE video's slug | "Video not found" message |
| 16 | Access UNLISTED video | Navigate directly to an UNLISTED video's slug | Video loads (accessible by direct link) |

**Traffic source verification:**

| Referral Path | Expected `?src=` | Analytics `trafficSource` |
|---------------|-------------------|---------------------------|
| From video listing (search) | `?src=search` | `SEARCH` |
| From channel page | `?src=channel` | `CHANNEL` |
| From tag page | `?src=tag` | `TAG` |
| From short link | `?src=share` | `SHARE` |
| Direct URL access | No `?src` | `DIRECT` |

---

### UI-FLOW 5: Channel Landing Page

**URL**: `http://localhost:3000/en/channels/education`  
**Data required**: "education" channel created (Section 2.2), at least one PUBLISHED + PUBLIC video in that channel

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open channel page | "Channel" label, channel name "Education", description shown. Video count shown. |
| 2 | Verify video grid | Only PUBLISHED + PUBLIC videos from this channel displayed. Responsive grid layout. |
| 3 | Verify video cards | Each card shows thumbnail, title, tagline, uploader name (if visible), publish date. |
| 4 | Click a video card | Navigates to `/en/v/<slug>?src=channel` |
| 5 | Verify pagination | Previous/Next buttons, page indicator |
| 6 | Empty channel | Navigate to a channel with no published videos | "No videos found in this channel yet." |
| 7 | Non-existent channel | Navigate to `/en/channels/nonexistent` | "Channel not found" message |
| 8 | Sinhala locale | Navigate to `/si/channels/education` | Channel name shown in Sinhala ("අධ්‍යාපනය") |

---

### UI-FLOW 6: Tag Landing Page

**URL**: `http://localhost:3000/en/tags/science`  
**Data required**: "science" tag created (Section 2.3), at least one PUBLISHED + PUBLIC video with that tag

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open tag page | "Tag" label, tag name "Science", description (if set), video count |
| 2 | Verify video grid | Only PUBLISHED + PUBLIC videos with this tag. Responsive grid. |
| 3 | Click a video card | Navigates to `/en/v/<slug>?src=tag` |
| 4 | Empty tag | Tag with no published videos | "No videos yet" with explanation |
| 5 | Non-existent tag | Navigate to `/en/tags/nonexistent` | 404 page |

---

### UI-FLOW 7: Embed Player

**URL**: `http://localhost:3000/en/embed/<slug>`  
**Data required**: A PUBLISHED + PUBLIC video

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open embed page | Minimal black-themed player page. Video player, title, tagline, "Watch on Streamora" link. |
| 2 | Play video | HLS stream loads and plays. Analytics tracked with `trafficSource: EXTERNAL`. |
| 3 | Click "Watch on Streamora" | Opens canonical video page in new tab |
| 4 | Verify noindex | View page source: `<meta name="robots" content="noindex, nofollow">` |
| 5 | Test in iframe | Create an HTML file with `<iframe src="http://localhost:3000/en/embed/<slug>"></iframe>` and open it | Player loads inside iframe (CSP allows it) |
| 6 | Non-published video | Navigate to embed page for non-PUBLISHED video | 404 |

---

### UI-FLOW 8: Short Link Redirect

**URL**: `http://localhost:3000/s/<code>`  
**Data required**: A short link created via API (Flow 15)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open short link | Immediately redirected to `/en/v/<slug>?src=share` |
| 2 | Invalid code | Navigate to `/s/INVALID` | 404 page |

---

### UI-FLOW 9: Upload Video (Creator)

**URL**: `http://localhost:3000/en/upload`  
**Data required**: Logged in as creator, a test `.mp4` video file

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open upload page (not logged in) | May redirect to login or show auth error |
| 2 | Open upload page (logged in) | "Upload" heading shown. File selection UI visible. |
| 3 | Select a video file | File appears in upload queue with filename, size, and status indicators |
| 4 | Observe upload progress | Progress bar shows upload percentage. Status transitions: QUEUED → INITIATING → UPLOADING → COMPLETING → COMPLETED |
| 5 | Upload completes | "Completed" status shown. "Edit Metadata" link appears for the new video. |
| 6 | Click "Edit Metadata" | Navigates to `/en/dashboard/videos/<id>/edit` |

---

### UI-FLOW 10: Bulk Upload Manager

**URL**: `http://localhost:3000/en/dashboard/uploads`  
**Data required**: Logged in as creator, multiple test `.mp4` files

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open bulk upload page | `BulkUploadManager` component visible |
| 2 | Select multiple files | Each file added to queue with individual progress bars |
| 3 | Observe parallel uploads | Max 2 concurrent uploads. Others wait in QUEUED state. |
| 4 | Pause an upload | Upload pauses (if supported by component) |
| 5 | Resume an upload | Upload resumes from where it stopped |
| 6 | Remove a queued item | Item removed from queue |
| 7 | Retry a failed upload | Failed item shows retry option |
| 8 | Refresh page | Upload queue persists via `localStorage` |
| 9 | All uploads complete | Each file shows COMPLETED status with "Edit Metadata" links |

---

### UI-FLOW 11: Creator Dashboard (Analytics Overview)

**URL**: `http://localhost:3000/en/dashboard`  
**Data required**: Logged in as creator, at least one video with analytics data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open dashboard | "Dashboard" heading. "Overview for the last 30 days" subtitle. |
| 2 | Verify stat cards | 5 cards: Views, Unique Viewers, Play Starts, Completions, Completion Rate |
| 3 | Verify traffic sources | Section showing Direct, Share, Channel, Tag, Search, External, Unknown counts |
| 4 | Verify daily trend | Date-sorted list with Views, Starts, Completions per day |
| 5 | Verify top videos | Up to 5 videos with thumbnail, title, views, starts, completion rate. "View Analytics" link. |
| 6 | Click "7 days" toggle | Data reloads for 7-day range |
| 7 | Click "30 days" toggle | Data reloads for 30-day range |
| 8 | Click "Bulk Upload" link | Navigates to `/en/dashboard/uploads` |
| 9 | Click "My Videos" link | Navigates to `/en/dashboard/videos` |
| 10 | Click "View Analytics" on a top video | Navigates to `/en/dashboard/videos/<id>/analytics` |
| 11 | No analytics data | Dashboard loads but shows 0 values and "No data available" in trend |

---

### UI-FLOW 12: Creator Video List

**URL**: `http://localhost:3000/en/dashboard/videos`  
**Data required**: Logged in as creator with at least 2-3 videos in different statuses

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open my videos page | "My Videos" heading. Search form with keyword, status dropdown, visibility dropdown. |
| 2 | Verify video list | Each video card shows thumbnail, title, tagline, status badge, visibility badge, scheduled badge (if applicable). Action links: Edit, Thumbnails, Analytics. |
| 3 | Filter by status | Select "DRAFT" from dropdown, click Search | Only DRAFT videos shown |
| 4 | Filter by visibility | Select "PUBLIC" | Only PUBLIC videos shown |
| 5 | Search by keyword | Enter keyword, click Search | Matching videos shown |
| 6 | Click "Edit" | Navigates to `/en/dashboard/videos/<id>/edit` |
| 7 | Click "Thumbnails" | Navigates to `/en/dashboard/videos/<id>/thumbnails` |
| 8 | Click "Analytics" | Navigates to `/en/dashboard/videos/<id>/analytics` |
| 9 | Pagination | If > 12 videos, Previous/Next buttons work |
| 10 | Click "Clear" | All filters removed |

---

### UI-FLOW 13: Video Draft Editor

**URL**: `http://localhost:3000/en/dashboard/videos/<id>/edit`  
**Data required**: Logged in as creator, a video in editable status, channels and tags exist

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open editor | "Edit Draft" heading. Status badge shown. Language tabs (EN, SI, TA). |
| 2 | Verify EN tab is active | Title, Description, Tagline, Audience fields visible with current values |
| 3 | Enter English metadata | Type title, description, tagline, audience | Fields update in real-time |
| 4 | Switch to SI tab | Click "SI" tab. Fields now show Sinhala values (empty if not yet set). |
| 5 | Enter Sinhala title | Type Sinhala text in title field | Field updates |
| 6 | Switch to TA tab | Click "TA" tab. Tamil fields shown. |
| 7 | Select channels | Click channel buttons (e.g., "Education") | Button highlights (blue background). Multiple selection. |
| 8 | Deselect a channel | Click highlighted channel button | Button un-highlights |
| 9 | Select tags | Click tag buttons (e.g., "Science", "Technology") | Tags highlight |
| 10 | Set visibility | Visibility selector shows PUBLIC/UNLISTED/PRIVATE options | Select PUBLIC → video visibility updates |
| 11 | Set schedule | Schedule editor shows datetime input | Enter future datetime → scheduleRequested becomes true |
| 12 | Click "Save Draft" | "Saving..." shown briefly, then "Draft saved" success message |
| 13 | Verify saved data | Reload page → all translations, channels, tags, visibility, schedule preserved |
| 14 | Submit for approval | If status is READY, "Submit for Approval" button visible. Click it. | Confirmation dialog → Status changes to PENDING_APPROVAL. |
| 15 | Non-editable status | Open editor for a PUBLISHED video | Yellow warning: "This video is not editable in its current status (PUBLISHED)". All fields disabled. |

**Rejection feedback (if video was rejected):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 16 | Open rejected video | Red rejection panel visible with "Rejected by Moderation" heading |
| 17 | Verify rejection details | Reason and Admin Notes shown in red panel |
| 18 | Click "Resubmit for Approval" | Button click → "Resubmitting..." → Status changes to PENDING_APPROVAL. Revision badge appears. |

**Governance messages (if video was taken down or archived):**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 19 | Open taken-down video | Red panel: "Video Removed by Administration" with reason, notes, date |
| 20 | Open archived video | Gray panel: "Archived" with reason, notes, date |

**Additional actions:**

| Step | Action | Expected Result |
|------|--------|-----------------|
| 21 | Click "Manage Thumbnails" | Navigates to thumbnails page (visible for READY+ statuses) |
| 22 | Click "Manage Subtitles" | Navigates to subtitles page |
| 23 | Click "Copy Share Link" | Short link created/copied to clipboard |
| 24 | Click "Copy Embed Code" | Iframe HTML copied to clipboard |
| 25 | Click "Back to Dashboard" | Navigates back to dashboard |

---

### UI-FLOW 14: Thumbnail Picker

**URL**: `http://localhost:3000/en/dashboard/videos/<id>/thumbnails`  
**Data required**: Logged in as creator, a video with completed processing (6 auto-thumbnails)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open thumbnails page | "Manage Thumbnails" heading. "Back to Edit" link. ThumbnailPicker component loaded. |
| 2 | Verify auto-thumbnails | 6 auto-generated thumbnails displayed in grid. One marked as selected. |
| 3 | Click a different thumbnail | Selected thumbnail changes. Previously selected one deselects. |
| 4 | Upload custom thumbnail | Click upload button, select a JPEG/PNG/WebP image (< 5MB) | Custom thumbnail appears and auto-selects. |
| 5 | Custom thumbnail persists | Reload page | Custom thumbnail still present and selected |
| 6 | Click "Back to Edit" | Returns to edit page |

---

### UI-FLOW 15: Subtitle Management

**URL**: `http://localhost:3000/en/dashboard/videos/<id>/subtitles`  
**Data required**: Logged in as creator, a video in editable status, `.vtt` subtitle test files

Prepare test subtitle files before testing:

**`test-en.vtt`:**
```
WEBVTT

00:00:01.000 --> 00:00:05.000
Hello, welcome to this video.

00:00:05.000 --> 00:00:10.000
This is a test subtitle in English.
```

**`test-si.vtt`:**
```
WEBVTT

00:00:01.000 --> 00:00:05.000
ආයුබෝවන්, මෙම වීඩියෝවට සාදරයෙන් පිළිගනිමු.
```

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open subtitles page | "Subtitles" heading. Three locale sections: English (en), Sinhala (si), Tamil (ta). Each shows "Not uploaded" badge. |
| 2 | Click "Upload" for English | File picker opens |
| 3 | Select `test-en.vtt` | "Uploading..." indicator → "Subtitle uploaded successfully for English" success message. Badge changes to "Uploaded". Format shown as VTT. "View file" link appears. |
| 4 | Click "View file" link | Opens the VTT file URL in new tab (GCS/CDN URL) |
| 5 | Upload Sinhala subtitle | Click "Upload" for Sinhala, select `test-si.vtt` | Same success flow for Sinhala |
| 6 | Click "Replace" for English | Upload a different `.vtt` file | File replaced, success message |
| 7 | Click "Delete" for English | Confirmation dialog | Click OK → subtitle deleted, badge reverts to "Not uploaded" |
| 8 | Verify supported formats info | Blue info box shows: WebVTT (.vtt), SubRip (.srt), max 1MB |
| 9 | Click "Back to Edit" | Returns to edit page |

---

### UI-FLOW 16: Per-Video Analytics

**URL**: `http://localhost:3000/en/dashboard/videos/<id>/analytics`  
**Data required**: Logged in as creator, a video with analytics data

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open analytics page | "Video Analytics" heading. Edit and Back links. |
| 2 | Verify stat cards | 4 cards: Views, Unique Viewers, Completions, Completion Rate |
| 3 | Verify traffic sources | Cards showing Direct, Share, Channel, Tag, Search, External, Unknown |
| 4 | Verify daily trend | Date-sorted rows with Views and Completions per day |
| 5 | No analytics yet | For a new video | "No analytics yet." message |
| 6 | Click "Edit" | Navigates to edit page |
| 7 | Click "Back" | Navigates to video list |

---

### UI-FLOW 17: Admin Panel

**URL**: `http://localhost:3000/en/admin`  
**Data required**: Logged in as admin

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open admin page (as admin) | "Admin" heading. Two links: "Moderation Queue" and "Failed Jobs". |
| 2 | Click "Moderation Queue" | Navigates to `/en/admin/moderation` |
| 3 | Click "Failed Jobs" | Navigates to `/en/admin/jobs` |
| 4 | Open admin page (as creator) | Access denied / error (no admin role) |

---

### UI-FLOW 18: Moderation Queue

**URL**: `http://localhost:3000/en/admin/moderation`  
**Data required**: Logged in as admin, at least one video in PENDING_APPROVAL status

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open moderation page | "Moderation Queue" heading. Status filter tabs: PENDING APPROVAL, APPROVED, REJECTED, PUBLISHED, TAKEDOWN, ARCHIVED. |
| 2 | Verify PENDING_APPROVAL tab | Default tab active. Pending videos listed with title, status, uploader name (or "Uploader hidden"), creation date. |
| 3 | Verify resubmission info | If a video was resubmitted: "Revision 2" badge visible, "Resubmitted <date>" text. Previously rejected reason shown as context. |
| 4 | Click "Approve" | Video status changes to APPROVED. Video disappears from PENDING list. Check APPROVED tab to confirm. |
| 5 | Click "Publish" | Video status changes to PUBLISHED + PUBLIC. Check PUBLISHED tab. |
| 6 | Click "Reject" | Rejection form expands with: Reason (required) input, Admin Notes (optional) textarea, Confirm Reject and Cancel buttons. |
| 7 | Enter rejection reason + note | Fill both fields |
| 8 | Click "Confirm Reject" | Video status → REJECTED. Disappears from PENDING list. Reason shown on REJECTED tab. |
| 9 | Click "Cancel" (rejection form) | Rejection form collapses, no changes |
| 10 | Reject without reason | Leave reason empty, click Confirm | Alert: "Please provide a rejection reason" |
| 11 | Switch to PUBLISHED tab | Shows published videos. Each has "Take Down" and "Archive" buttons. |
| 12 | Click "Take Down" | Browser prompt asks for reason (required) and notes (optional). Enter both. | Video status → TAKEDOWN. Takedown info shown on TAKEDOWN tab. |
| 13 | Click "Archive" | Browser prompt asks for reason and notes. | Video status → ARCHIVED. |
| 14 | Switch to TAKEDOWN/ARCHIVED tab | Shows taken-down/archived videos with reason, date. "Restore" button visible. |
| 15 | Click "Restore" | Browser prompt asks for restore note. | Video status → PUBLISHED. Moves to PUBLISHED tab. |
| 16 | Click "Preview" | Opens `/en/watch/<id>` in same tab |
| 17 | Click "Share Page" | Opens `/en/v/<slug>` in new tab |

---

### UI-FLOW 19: Admin Jobs Dashboard

**URL**: `http://localhost:3000/en/admin/jobs`  
**Data required**: Logged in as admin (optionally, a processing failure to have data)

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open jobs page | "Failed Jobs" heading |
| 2 | If failed jobs exist | Each job card shows: video title, job type (THUMBS_HLS), status (FAILED), attempt count, error message, correlation ID |
| 3 | No failed jobs | "No failed jobs." message |
| 4 | Not logged in | "Not logged in" error shown |

---

### UI-FLOW 20: Internationalization (i18n)

**Data required**: Videos and channels with multi-locale translations

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Open `http://localhost:3000/en/videos` | English content shown |
| 2 | Change URL to `/si/videos` | Sinhala translations shown where available. Falls back to English where missing. |
| 3 | Change URL to `/ta/videos` | Tamil translations shown where available. Falls back to English where missing. |
| 4 | Open `/en/channels/education` | Channel name: "Education" |
| 5 | Open `/si/channels/education` | Channel name: "අධ්‍යාපනය" |
| 6 | Open `/ta/channels/education` | Channel name: "கல்வி" |
| 7 | Open `/videos` (no locale prefix) | Redirected to `/en/videos` (default locale) |
| 8 | Open video share page in Sinhala | `/si/v/<slug>` | Title/description in Sinhala if available, English fallback otherwise |

---

## 5. Security & Edge Case Tests

### 5.1 Authentication Tests

| Test | Action | Expected |
|------|--------|----------|
| No JWT on protected route | `curl http://localhost:3001/creator/videos` | `401 Unauthorized` |
| Expired JWT | Use an expired token | `401 Unauthorized` |
| Invalid JWT signature | Tamper with token payload | `401 Unauthorized` |
| Creator on admin route | `curl http://localhost:3001/admin/ping -H "Authorization: Bearer $CREATOR_TOKEN"` | `403 Forbidden` |
| Admin on creator route | `curl http://localhost:3001/creator/videos -H "Authorization: Bearer $ADMIN_TOKEN"` | Works (admin has superuser-like JWT) |

### 5.2 Ownership Tests

| Test | Action | Expected |
|------|--------|----------|
| Edit another creator's video | PATCH `/creator/videos/<other_user_video>` with own token | Ownership error |
| Complete another user's upload | POST `/uploads/<other_intent>/complete` | `403 Forbidden` |
| View another creator's analytics | GET `/creator/videos/<other_video>/analytics` | Ownership error |
| Delete another creator's subtitle | DELETE `/creator/videos/<other_video>/subtitles/en` | Ownership error |
| Select another creator's thumbnail | POST `/creator/videos/<other_video>/thumbnails/<id>/select` | Ownership error |

### 5.3 Upload Limit Tests

| Test | Action | Expected |
|------|--------|----------|
| Pending creator: > 250MB | `sizeBytes: 300000000` in upload init | `400 File too large for your role (max 262144000 bytes)` |
| Approved creator: > 2GB | `sizeBytes: 3000000000` in upload init | `400 File too large for your role` |
| Pending creator: 6th upload/day | Init 6th upload in same day | `400 Daily upload limit reached (5)` |
| Approved creator: 101st upload/day | Init 101st upload in same day | `400 Daily upload limit reached (100)` |
| Size mismatch on complete | Declare 10MB, upload 5MB | `400 Size mismatch. expected=10485760 actual=5242880` |
| GCS object missing on complete | Complete without actual GCS upload | `400 GCS object not found` |

### 5.4 Visibility Tests

| Test | Action | Expected |
|------|--------|----------|
| PUBLIC + PUBLISHED in listing | GET `/videos` | Video appears |
| UNLISTED + PUBLISHED in listing | GET `/videos` | Video does NOT appear |
| UNLISTED + PUBLISHED by slug | GET `/public/videos/<slug>` | Video accessible |
| PRIVATE + PUBLISHED in listing | GET `/videos` | Video does NOT appear |
| PRIVATE + PUBLISHED by slug | GET `/public/videos/<slug>` | `404 Not Found` |
| TAKEDOWN by slug | GET `/public/videos/<slug>` | `404 Not Found` |
| ARCHIVED by slug | GET `/public/videos/<slug>` | `404 Not Found` |

### 5.5 Moderation State Machine Tests

| Test | Action | Expected |
|------|--------|----------|
| Submit DRAFT video | POST `/creator/videos/<draft>/submit` | Error: only READY can be submitted |
| Reject non-PENDING video | POST `/admin/videos/<published>/reject` | `400 Only pending videos can be rejected` |
| Resubmit non-REJECTED video | POST `/creator/videos/<draft>/resubmit` | Error: only REJECTED can be resubmitted |
| Approve overdue schedule | Approve video whose `scheduledAt` has passed | Status → PUBLISHED immediately |
| Reject with 501-char reason | Reason exceeding 500 chars | `400 Rejection reason must be 500 characters or less` |
| Reject with 2001-char note | Note exceeding 2000 chars | `400 Rejection note must be 2000 characters or less` |

### 5.6 Rate Limiting Tests

| Test | Action | Expected |
|------|--------|----------|
| Analytics: > 60 req/min | Send 61 analytics events in < 60 seconds | `429 Too Many Requests` after 60th |
| General API: > 120 req/min | Send 121 requests in < 60 seconds | `429 Too Many Requests` after 120th |

### 5.7 Privacy Tests

| Test | Action | Expected |
|------|--------|----------|
| Pending creator's identity | Public video page for pending creator's video | `uploader: null` (identity hidden) |
| Approved creator's identity | Public video page for approved creator's video | `uploader: "<displayName>"` |
| Analytics viewer hash | Check `VideoAnalyticsEvent` rows in DB | `viewerHash` is SHA-256 hash, no raw IP stored. `ipHash` is SHA-256. |

---

## 6. Complete Endpoint Reference

### Public Endpoints (No Auth)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check (DB + Redis) |
| GET | `/version` | API version |
| GET | `/videos` | Public video listing with `?q=&channel=&tag=&locale=&page=&pageSize=` |
| GET | `/videos/:slug/embed` | Embed data for a video |
| GET | `/videos/:id/playback` | HLS playback URL |
| GET | `/public/videos/:slug` | Video share page data (OG metadata) |
| GET | `/public/videos/:slug/embed` | Embed video data (alt route) |
| GET | `/channels/:slug` | Channel landing page with `?locale=&page=&pageSize=` |
| GET | `/tags/:slug` | Tag landing page with `?locale=&page=&pageSize=` |
| GET | `/short-links/:code` | Resolve short link to video URL |
| POST | `/analytics/videos/:id/events` | Track analytics event (rate-limited: 60/min) |

### Creator Endpoints (JWT Required)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/me` | User sync + role sync |
| POST | `/creator/videos/draft` | Create video draft |
| GET | `/creator/videos` | List my videos with `?locale=&q=&status=&visibility=&page=&pageSize=` |
| GET | `/creator/videos/:id` | Get single video |
| PATCH | `/creator/videos/:id` | Update draft metadata |
| POST | `/creator/videos/:id/submit` | Submit for moderation |
| POST | `/creator/videos/:id/resubmit` | Resubmit rejected video |
| PATCH | `/creator/videos/:id/visibility` | Set PUBLIC/UNLISTED/PRIVATE |
| PATCH | `/creator/videos/:id/schedule` | Set scheduled publish time |
| GET | `/creator/videos/:id/thumbnails` | List thumbnails |
| POST | `/creator/videos/:id/thumbnails/:thumbId/select` | Select thumbnail |
| POST | `/creator/videos/:id/thumbnails/upload` | Upload custom thumbnail (multipart, max 5MB) |
| GET | `/creator/videos/:id/subtitles` | List subtitles |
| POST | `/creator/videos/:id/subtitles` | Upload subtitle (multipart, max 1MB, .vtt/.srt) |
| DELETE | `/creator/videos/:id/subtitles/:locale` | Delete subtitle |
| GET | `/creator/videos/:id/analytics` | Per-video analytics with `?days=` |
| GET | `/creator/analytics/overview` | Creator analytics overview with `?days=7|30` |
| POST | `/uploads/init` | Init GCS resumable upload |
| POST | `/uploads/:id/complete` | Complete upload + trigger processing |
| POST | `/uploads/:id/progress` | Update upload progress |
| POST | `/uploads/:id/fail` | Mark upload as failed |
| GET | `/uploads/:id/status` | Check upload status |
| GET | `/uploads/limits` | Get role-based upload limits |
| GET | `/creator/uploads` | List active uploads |
| POST | `/videos/:id/share` | Create/get short share link |

### Admin Endpoints (JWT + ADMIN/MODERATOR Role)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/admin/ping` | Admin auth check |
| GET | `/admin/moderation/queue` | Moderation queue with `?status=` filter |
| POST | `/admin/videos/:id/approve` | Approve video |
| POST | `/admin/videos/:id/reject` | Reject video (body: `{ reason, note? }`) |
| POST | `/admin/videos/:id/publish` | Publish video |
| POST | `/admin/videos/:id/takedown` | Takedown (body: `{ reason, note? }`) |
| POST | `/admin/videos/:id/archive` | Archive (body: `{ reason?, note? }`) |
| POST | `/admin/videos/:id/restore` | Restore (body: `{ note? }`) |
| POST | `/admin/users/:id/creator-approve` | Approve creator (ADMIN only) |
| POST | `/admin/users/:id/creator-reject` | Reject creator (ADMIN only) |
| POST | `/admin/users/:id/notes` | Add notes to creator (ADMIN only) |
| POST | `/admin/channels` | Create channel (ADMIN only) |
| PATCH | `/admin/channels/:id` | Update channel (ADMIN only) |
| POST | `/admin/tags` | Create tag (ADMIN only) |
| PATCH | `/admin/tags/:id` | Update tag (ADMIN only) |
| GET | `/admin/jobs` | List processing jobs with `?status=` filter |

### Frontend Pages

| Route | Auth | Page |
|-------|------|------|
| `/[locale]/` | None | Landing page |
| `/[locale]/login` | None | Login (Keycloak redirect) |
| `/[locale]/auth/callback` | None | OAuth callback |
| `/[locale]/videos` | None | Public video listing with search |
| `/[locale]/v/[slug]` | None | Video share/watch page (SSR + OG) |
| `/[locale]/channels/[slug]` | None | Channel landing page |
| `/[locale]/tags/[slug]` | None | Tag landing page |
| `/[locale]/embed/[slug]` | None | Embeddable player (iframe) |
| `/s/[code]` | None | Short link redirect |
| `/[locale]/upload` | JWT | Upload page |
| `/[locale]/dashboard` | JWT | Creator dashboard (analytics overview) |
| `/[locale]/dashboard/videos` | JWT | Creator video list |
| `/[locale]/dashboard/videos/[id]/edit` | JWT | Draft metadata editor |
| `/[locale]/dashboard/videos/[id]/thumbnails` | JWT | Thumbnail picker |
| `/[locale]/dashboard/videos/[id]/subtitles` | JWT | Subtitle management |
| `/[locale]/dashboard/videos/[id]/analytics` | JWT | Per-video analytics |
| `/[locale]/dashboard/uploads` | JWT | Bulk upload manager |
| `/[locale]/admin` | Admin | Admin panel |
| `/[locale]/admin/moderation` | Admin | Moderation queue |
| `/[locale]/admin/jobs` | Admin | Processing jobs dashboard |
| `/[locale]/watch/[videoId]` | None | Video watch page (by ID) |
