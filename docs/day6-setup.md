# Day 6 — Upload Complete + Verification + Pub/Sub

## Summary

Implemented upload completion with GCS verification, VideoAsset creation, and Pub/Sub event publishing for worker consumption.

## Changes Made

### 1. Database Schema ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added**: `VideoAsset` model
- `videoId` (unique, 1:1 with Video)
- `bucket`, `originalKey` (GCS location)
- `contentType`, `sizeBytes`
- `durationSec`, `width`, `height` (filled later by ffprobe)
- Relations to Video

**Updated**: `Video` model
- Added `asset VideoAsset?` relation

### 2. Pub/Sub Service ✅

**Created**: `apps/api/src/events/pubsub.service.ts`
- Google Cloud Pub/Sub client
- `publish()` method for sending events

**Dependencies**: Added `@google-cloud/pubsub`

### 3. Upload Complete Endpoint ✅

**Created**: `apps/api/src/uploads/uploads.complete-v2.controller.ts`
- **Endpoint**: `POST /uploads/:id/complete`
- **Features**:
  - Verifies object exists in GCS
  - Verifies size matches expected
  - Marks UploadIntent as COMPLETED
  - Sets Video.status = UPLOADED
  - Upserts VideoAsset record
  - Publishes Pub/Sub event `video.uploaded`

### 4. Web Integration ✅

**Updated**: `apps/web/src/components/upload-manager.tsx`
- Calls `/uploads/:id/complete` after upload success
- Updates message: "Upload verified & queued for processing ✅"
- Handles verification errors

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

This installs:
- `@google-cloud/pubsub` (for event publishing)

### 2. Set Up Pub/Sub Topic

#### A) Create Topic in GCP

```bash
# Using gcloud CLI
gcloud pubsub topics create video.uploaded --project=your-project-id
```

Or via GCP Console:
1. Go to **Pub/Sub** → **Topics**
2. Click **Create Topic**
3. Topic ID: `video.uploaded`
4. Click **Create**

#### B) Set Environment Variable

Add to root `.env`:

```bash
PUBSUB_TOPIC_VIDEO_UPLOADED=video.uploaded
```

### 3. Run Prisma Migration

```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name day6_video_asset
pnpm prisma generate
cd ../../
```

This will:
- Create `VideoAsset` table
- Add `asset` relation to Video
- Generate Prisma Client

### 4. Verify Migration

```bash
# Check table was created
docker exec -it streamora-postgres psql -U streamora -d streamora -c "\d \"VideoAsset\""
```

Should show the table structure.

## Testing

### 1. Test Upload Complete Flow

1. Start an upload via web UI
2. Wait for upload to finish
3. **Verify**:
   - UploadIntent.status = COMPLETED
   - Video.status = UPLOADED
   - VideoAsset record created
   - Pub/Sub message published

### 2. Test GCS Verification

**Test missing object**:
- Manually delete object from GCS
- Call `/uploads/:id/complete`
- **Expected**: `400 Bad Request: GCS object not found`

**Test size mismatch**:
- Modify object size in GCS (if possible)
- Call `/uploads/:id/complete`
- **Expected**: `400 Bad Request: Size mismatch`

### 3. Test Pub/Sub Event

**Create subscription** (for testing):
```bash
gcloud pubsub subscriptions create video-uploaded-test \
  --topic=video.uploaded \
  --project=your-project-id
```

**Pull messages**:
```bash
gcloud pubsub subscriptions pull video-uploaded-test \
  --project=your-project-id \
  --limit=1
```

**Expected**: Message with:
```json
{
  "type": "video.uploaded",
  "videoId": "...",
  "uploadIntentId": "...",
  "bucket": "streamora-originals-dev",
  "objectKey": "originals/.../...mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600,
  "occurredAt": "2024-01-01T12:00:00Z"
}
```

### 4. Test Database Updates

After upload completes:

```sql
-- Check UploadIntent
SELECT id, status, completed_at 
FROM "UploadIntent" 
WHERE id = '...';

-- Check Video
SELECT id, status 
FROM "Video" 
WHERE id = '...';

-- Check VideoAsset
SELECT video_id, bucket, original_key, size_bytes 
FROM "VideoAsset" 
WHERE video_id = '...';
```

**Expected**:
- UploadIntent: `status = COMPLETED`, `completed_at` set
- Video: `status = UPLOADED`
- VideoAsset: Record exists with GCS path and size

## API Endpoint

### POST /uploads/:id/complete

**Authentication**: Required (JWT)

**Path Parameter**: `id` (uploadIntentId)

**Response**:
```json
{
  "ok": true,
  "videoId": "clx123abc",
  "uploadIntentId": "clx456def",
  "objectKey": "originals/.../...mp4"
}
```

**If already completed**:
```json
{
  "ok": true,
  "alreadyCompleted": true
}
```

**Errors**:
- `404 Not Found`: User not found
- `404 Not Found`: Upload intent not found
- `403 Forbidden`: Not owner of upload
- `400 Bad Request`: GCS object not found
- `400 Bad Request`: Size mismatch
- `400 Bad Request`: Missing PUBSUB_TOPIC_VIDEO_UPLOADED

## Pub/Sub Event

### Topic: `video.uploaded`

**Message Format**:
```json
{
  "type": "video.uploaded",
  "videoId": "string",
  "uploadIntentId": "string",
  "bucket": "string",
  "objectKey": "string",
  "contentType": "string",
  "sizeBytes": number,
  "occurredAt": "ISO8601 timestamp"
}
```

**Consumers** (Day 7):
- Worker will subscribe to this topic
- Process video: ffprobe, thumbnails, HLS

## Database Changes

### VideoAsset Table

**Fields**:
- `id`: Primary key
- `videoId`: Unique, foreign key to Video
- `bucket`: GCS bucket name
- `originalKey`: GCS object key
- `contentType`: MIME type
- `sizeBytes`: File size
- `durationSec`: Video duration (filled by worker)
- `width`, `height`: Video dimensions (filled by worker)

### Video Status Transition

- `DRAFT` → `UPLOADED` (when upload completes)
- Next: `UPLOADED` → `PROCESSING` (when worker starts)
- Next: `PROCESSING` → `READY` (when worker finishes)

## Day 6 LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] VideoAsset table created
- [ ] Pub/Sub topic `video.uploaded` created
- [ ] Environment variable `PUBSUB_TOPIC_VIDEO_UPLOADED` set
- [ ] Upload finishes in browser
- [ ] `/uploads/:id/complete` verifies object exists
- [ ] `/uploads/:id/complete` verifies size matches
- [ ] UploadIntent.status = COMPLETED
- [ ] Video.status = UPLOADED
- [ ] VideoAsset record created/updated
- [ ] Pub/Sub event published
- [ ] Message visible in Pub/Sub subscription

## Troubleshooting

### "GCS object not found"

- Check object exists: `gsutil ls gs://bucket/originals/...`
- Verify objectKey is correct
- Check bucket name matches

### "Size mismatch"

- GCS object size doesn't match expected
- May happen if upload was interrupted
- Check actual size: `gsutil stat gs://bucket/originals/...`

### "Missing PUBSUB_TOPIC_VIDEO_UPLOADED"

- Ensure `.env` has: `PUBSUB_TOPIC_VIDEO_UPLOADED=video.uploaded`
- Verify topic exists in GCP Console

### Pub/Sub Permission Errors

- Service account needs "Pub/Sub Publisher" role
- Or "Pub/Sub Editor" for full access
- Grant on project or topic level

### Transaction Errors

- All DB updates are atomic (transaction)
- If any step fails, all rollback
- Check logs for specific error

## Next Steps

After Day 6 is locked:
- **Day 7**: Worker v1 (ffprobe + thumbnails)
- Worker will subscribe to `video.uploaded` topic
- Process video and update VideoAsset with metadata
