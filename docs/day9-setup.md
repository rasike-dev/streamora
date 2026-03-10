# Day 9 — Moderation + Approval Gates + Public Listing + Uploader Privacy

## Summary

Implemented moderation workflow where videos are not publicly visible until admin approval. Guest creators (CREATOR_PENDING) can upload, but their videos go to PENDING_APPROVAL. Uploader identity is hidden from public until creator is approved. Admin has a moderation queue to approve/reject/publish videos.

## Changes Made

### 1. Worker Status Transitions ✅

**Updated**: `apps/worker/src/worker.ts`

After processing completes (thumbnails + HLS), the worker now sets video status based on creator approval:
- If creator is **APPROVED** → video becomes **APPROVED**
- Otherwise → video becomes **PENDING_APPROVAL**

### 2. Public Video Endpoints ✅

**Created**: `apps/api/src/public/public.videos.controller.ts`
- **Endpoint**: `GET /videos`
- Returns only **PUBLISHED** videos with **PUBLIC** visibility
- Supports filtering by channel and tag
- Uploader identity hidden unless `uploaderVisible=true` and creator approved

**Created**: `apps/api/src/public/public.video-by-slug.controller.ts`
- **Endpoint**: `GET /videos/by-slug/:slug`
- Returns video details for published videos
- Enforces uploader privacy rules (checks creator approval)
- Returns 404 if not published or not public

### 3. Admin Moderation Endpoints ✅

**Created**: `apps/api/src/admin/admin.moderation.controller.ts`
- **Endpoint**: `GET /admin/moderation/queue?status=PENDING_APPROVAL`
  - Returns videos in moderation queue
  - Filterable by status (PENDING_APPROVAL, REJECTED, APPROVED)
- **Endpoint**: `POST /admin/videos/:id/approve`
  - Approves video (sets status to APPROVED)
- **Endpoint**: `POST /admin/videos/:id/reject`
  - Rejects video (sets status to REJECTED)
- **Endpoint**: `POST /admin/videos/:id/publish`
  - Publishes video (sets status to PUBLISHED, visibility to PUBLIC)

**Authentication**: Requires ADMIN or MODERATOR role

### 4. Admin User Management ✅

**Created**: `apps/api/src/admin/admin.users.controller.ts`
- **Endpoint**: `POST /admin/users/:id/creator-approve`
  - Approves creator (sets CreatorProfile.approval to APPROVED)
  - Sets `uploaderVisible=true` for all their videos
- **Endpoint**: `POST /admin/users/:id/creator-reject`
  - Rejects creator (sets CreatorProfile.approval to REJECTED)
- **Endpoint**: `POST /admin/users/:id/notes`
  - Adds internal notes to creator profile

**Authentication**: Requires ADMIN role

### 5. Admin Moderation UI ✅

**Created**: `apps/web/src/app/[locale]/admin/moderation/page.tsx`
- Displays moderation queue
- Shows pending videos with title, status, uploader name, creation date
- Actions: Approve, Publish, Reject, Preview
- Locale-aware routing

## Video Status Flow

```
UPLOADED → PROCESSING → [PENDING_APPROVAL | APPROVED] → PUBLISHED
                                    ↓
                                REJECTED
```

**Rules**:
1. After processing completes:
   - If creator is **APPROVED** → video becomes **APPROVED**
   - If creator is **PENDING** → video becomes **PENDING_APPROVAL**
2. Admin can:
   - **Approve** → sets to APPROVED (ready to publish)
   - **Publish** → sets to PUBLISHED + PUBLIC visibility
   - **Reject** → sets to REJECTED
3. Public endpoints only return **PUBLISHED** videos

## Uploader Privacy Rules

1. Uploader identity is hidden by default (`uploaderVisible=false`)
2. Even if `uploaderVisible=true`, identity is only shown if:
   - Creator profile approval is **APPROVED**
3. Admin can approve creators, which sets `uploaderVisible=true` for all their videos

## API Endpoints

### Public Endpoints

**GET /videos**
- Query params: `channel`, `tag`, `locale`
- Returns: List of published public videos
- Uploader identity hidden unless creator approved

**GET /videos/by-slug/:slug**
- Query params: `locale`
- Returns: Video details for published public videos
- Enforces uploader privacy rules

### Admin Endpoints

**GET /admin/moderation/queue?status=PENDING_APPROVAL**
- Returns: List of videos in moderation queue
- Requires: ADMIN or MODERATOR role

**POST /admin/videos/:id/approve**
- Approves video
- Requires: ADMIN or MODERATOR role

**POST /admin/videos/:id/reject**
- Rejects video
- Requires: ADMIN or MODERATOR role

**POST /admin/videos/:id/publish**
- Publishes video
- Requires: ADMIN or MODERATOR role

**POST /admin/users/:id/creator-approve**
- Approves creator
- Requires: ADMIN role

**POST /admin/users/:id/creator-reject**
- Rejects creator
- Requires: ADMIN role

**POST /admin/users/:id/notes**
- Adds notes to creator profile
- Requires: ADMIN role

## Testing

### 1. Test Status Transitions

1. Upload a video as a **CREATOR_PENDING** user
2. Wait for processing to complete
3. **Verify**: Video status is **PENDING_APPROVAL**
4. Approve the creator via `/admin/users/:id/creator-approve`
5. Upload another video
6. **Verify**: New video status is **APPROVED** (after processing)

### 2. Test Public Endpoints

1. Try to access unpublished video:
   ```bash
   curl http://localhost:3001/videos/by-slug/test-slug
   ```
   **Expected**: 404 Not Found

2. Publish a video via admin endpoint
3. Try again:
   ```bash
   curl http://localhost:3001/videos/by-slug/test-slug
   ```
   **Expected**: Video details returned

### 3. Test Moderation Queue

1. Login as ADMIN
2. Go to `/en/admin/moderation`
3. **Verify**: Pending videos appear in queue
4. Click "Approve" or "Publish"
5. **Verify**: Video status updates

### 4. Test Uploader Privacy

1. Upload video as **CREATOR_PENDING** user
2. Publish video (admin)
3. **Verify**: Uploader name is hidden in public endpoints
4. Approve creator via `/admin/users/:id/creator-approve`
5. **Verify**: Uploader name now appears in public endpoints

## GCS Cache-Control & CORS (Recommended)

### Cache-Control Strategy

**For HLS files**:
- **Segments (.ts)**: `Cache-Control: public, max-age=31536000, immutable`
- **Playlists (.m3u8)**: `Cache-Control: public, max-age=300` (5 minutes)

**Apply via gsutil**:
```bash
# Segments: long cache
gsutil -m setmeta -h "Cache-Control:public,max-age=31536000,immutable" \
  "gs://YOUR_RENDITIONS_BUCKET/**/*.ts"

# Playlists: shorter cache
gsutil -m setmeta -h "Cache-Control:public,max-age=300" \
  "gs://YOUR_RENDITIONS_BUCKET/**/*.m3u8"
```

**Note**: The worker already sets cache-control headers during upload, so this is only needed if you want to update existing files.

### CORS Configuration

Create `cors.json`:
```json
[
  {
    "origin": [
      "http://localhost:3000",
      "https://YOUR_DOMAIN_HERE"
    ],
    "method": ["GET", "HEAD", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Accept-Ranges",
      "Content-Range",
      "Range"
    ],
    "maxAgeSeconds": 3600
  },
  {
    "origin": [
      "http://localhost:3000",
      "https://YOUR_DOMAIN_HERE"
    ],
    "method": ["PUT", "POST", "OPTIONS"],
    "responseHeader": [
      "Content-Type",
      "Content-Range",
      "x-goog-resumable"
    ],
    "maxAgeSeconds": 3600
  }
]
```

**Apply to buckets**:
```bash
# Originals bucket (uploads)
gsutil cors set cors.json gs://YOUR_ORIGINALS_BUCKET

# Renditions bucket (playback)
gsutil cors set cors.json gs://YOUR_RENDITIONS_BUCKET

# Thumbs bucket (images)
gsutil cors set cors.json gs://YOUR_THUMBS_BUCKET
```

## Day 9 LOCK Checklist ✅

- [ ] Worker sets status to PENDING_APPROVAL or APPROVED based on creator approval
- [ ] Public GET /videos returns only PUBLISHED videos
- [ ] Public GET /videos/by-slug/:slug enforces visibility and uploader privacy
- [ ] Admin moderation queue shows pending videos
- [ ] Admin can approve/reject/publish videos
- [ ] Admin can approve/reject creators
- [ ] Uploader identity hidden for pending creators
- [ ] Uploader identity shown after creator approval
- [ ] Moderation UI page accessible at /[locale]/admin/moderation

## Next Steps

After Day 9 is locked:
- **Day 10**: Share page + OG metadata + social share buttons
- **Day 11**: Channels/Tags + filters (basic)
- **Day 12**: Stabilization (quotas, retries, logs)
