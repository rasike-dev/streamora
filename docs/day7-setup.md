# Day 7 — Worker: ffprobe + Thumbnails

## Summary

Implemented worker service that consumes Pub/Sub events, processes videos with ffprobe, generates thumbnails, and updates the database.

## Changes Made

### 1. Database Schema ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added**: `VideoThumbnail` model
- `videoId` (foreign key to Video)
- `bucket`, `objectKey` (GCS location)
- `width`, `height` (optional dimensions)
- `timeSec` (timestamp in video)
- `isSelected` (default thumbnail)
- Relations to Video

**Updated**: `Video` model
- Added `thumbnails VideoThumbnail[]` relation

### 2. Worker Code ✅

**Created**: `apps/worker/src/worker.ts`
- Pub/Sub subscriber for `video.uploaded` events
- Downloads video from GCS
- Runs `ffprobe` to extract metadata
- Generates 6 thumbnails using `ffmpeg`
- Uploads thumbnails to GCS
- Updates VideoAsset with metadata
- Creates VideoThumbnail records
- Updates Video.status = READY

### 3. Worker Dockerfile ✅

**Created**: `apps/worker/Dockerfile`
- Node.js 20 base image
- Installs ffmpeg/ffprobe
- Sets up worker environment

### 4. Thumbnails API ✅

**Created**: `apps/api/src/videos/video-thumbs.controller.ts`
- **Endpoint**: `GET /creator/videos/:id/thumbs`
- Returns thumbnails for a video (creator-only)

## Installation Steps

### 1. Install Worker Dependencies

```bash
# From repo root
cd apps/worker
pnpm add @google-cloud/pubsub @google-cloud/storage @prisma/client dotenv
pnpm add -D prisma typescript ts-node @types/node nodemon
cd ../../
```

### 2. Set Up Prisma in Worker

The worker needs access to Prisma Client. Copy the Prisma schema:

```bash
# Option 1: Symlink (recommended)
cd apps/worker
ln -s ../api/prisma prisma
cd ../../
```

Or copy the schema:

```bash
# Option 2: Copy schema
mkdir -p apps/worker/prisma
cp apps/api/prisma/schema.prisma apps/worker/prisma/schema.prisma
```

Generate Prisma Client in worker:

```bash
cd apps/worker
pnpm prisma generate
cd ../../
```

### 3. Run Prisma Migration

```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name day7_thumbnails
pnpm prisma generate
cd ../../
```

### 4. Create Worker Environment File

Create `apps/worker/.env`:

```bash
DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora

GCP_PROJECT_ID=your-gcp-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json

PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED=video-uploaded-dev-sub

GCS_BUCKET_THUMBS=streamora-thumbs-dev
```

### 5. Set Up Pub/Sub Subscription

Create subscription in GCP:

```bash
# Create topic (if not exists)
gcloud pubsub topics create video.uploaded --project=YOUR_PROJECT

# Create subscription
gcloud pubsub subscriptions create video-uploaded-dev-sub \
  --topic=video.uploaded \
  --project=YOUR_PROJECT
```

Or via GCP Console:
1. Go to **Pub/Sub** → **Subscriptions**
2. Click **Create Subscription**
3. Subscription ID: `video-uploaded-dev-sub`
4. Topic: `video.uploaded`
5. Click **Create**

### 6. Create GCS Bucket for Thumbnails

```bash
# Create bucket
gsutil mb -p YOUR_PROJECT gs://streamora-thumbs-dev

# Set permissions (if needed)
gsutil iam ch serviceAccount:YOUR_SERVICE_ACCOUNT@YOUR_PROJECT.iam.gserviceaccount.com:roles/storage.objectAdmin gs://streamora-thumbs-dev
```

### 7. Install ffmpeg (Local Dev)

**macOS**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt-get update && sudo apt-get install -y ffmpeg
```

**Windows**:
Download from https://ffmpeg.org/download.html

### 8. Run Worker

```bash
# From repo root
cd apps/worker
pnpm dev
```

Worker will:
- Connect to Pub/Sub subscription
- Listen for `video.uploaded` events
- Process videos as they arrive

## Testing

### 1. Test End-to-End Flow

1. Upload a video via web UI
2. Wait for upload to complete (status: UPLOADED)
3. **Verify**:
   - Worker receives Pub/Sub message
   - Video.status = PROCESSING (then READY)
   - VideoAsset has durationSec, width, height
   - 6 thumbnails created in GCS
   - VideoThumbnail records in DB

### 2. Check Worker Logs

Worker should log:
```
Streamora Worker Day07 listening on subscription: video-uploaded-dev-sub
Processing video.uploaded: videoId=clx123abc
Done: videoId=clx123abc
```

### 3. Verify Thumbnails in GCS

```bash
# List thumbnails
gsutil ls gs://streamora-thumbs-dev/thumbs/{videoId}/
```

Should show 6 files:
- `thumb_0.jpg`
- `thumb_1.jpg`
- ...
- `thumb_5.jpg`

### 4. Test Thumbnails API

```bash
# Get thumbnails for a video
curl -X GET http://localhost:3001/creator/videos/{videoId}/thumbs \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**:
```json
[
  {
    "id": "...",
    "bucket": "streamora-thumbs-dev",
    "objectKey": "thumbs/{videoId}/thumb_0.jpg",
    "isSelected": true,
    "timeSec": 3.0
  },
  ...
]
```

### 5. Check Database

```sql
-- Check VideoAsset metadata
SELECT video_id, duration_sec, width, height 
FROM "VideoAsset" 
WHERE video_id = '...';

-- Check thumbnails
SELECT video_id, object_key, time_sec, is_selected 
FROM "VideoThumbnail" 
WHERE video_id = '...'
ORDER BY created_at;
```

## Worker Processing Flow

1. **Receive Event**: Pub/Sub message with `video.uploaded`
2. **Update Status**: Video.status = PROCESSING
3. **Download**: Original video from GCS to temp directory
4. **ffprobe**: Extract metadata (duration, width, height)
5. **Update VideoAsset**: Store metadata in database
6. **Generate Thumbnails**: Extract 6 frames using ffmpeg
7. **Upload Thumbnails**: Upload to GCS thumbs bucket
8. **Update Database**: Create VideoThumbnail records
9. **Update Status**: Video.status = READY
10. **Cleanup**: Delete temp files

## Thumbnail Generation

### Strategy

- **6 thumbnails** per video
- **Distribution**: Spread across video (5%, 20%, 35%, 50%, 65%, 80%)
- **Avoid edges**: Skip first/last 5% of video
- **Default selection**: First thumbnail (`isSelected = true`)

### Timestamps

Thumbnails are extracted at:
- `safeStart + span * 0.05` (5%)
- `safeStart + span * 0.2` (20%)
- `safeStart + span * 0.35` (35%)
- `safeStart + span * 0.5` (50%)
- `safeStart + span * 0.65` (65%)
- `safeStart + span * 0.8` (80%)

Where:
- `safeStart = min(5, max(0, duration * 0.05))`
- `safeEnd = max(0, duration - min(5, duration * 0.05))`
- `span = max(1, safeEnd - safeStart)`

## Error Handling

### Worker Errors

If processing fails:
- Video.status = REJECTED
- Message is nacked (retry)
- Error logged to console

### Common Issues

**"ffprobe not found"**:
- Install ffmpeg: `brew install ffmpeg` (macOS)
- Or use Dockerfile (includes ffmpeg)

**"Original not found"**:
- Check GCS object exists
- Verify bucket name and objectKey

**"Missing env PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED"**:
- Ensure `apps/worker/.env` is set
- Check subscription name matches

**"Prisma Client not generated"**:
- Run `pnpm prisma generate` in worker directory
- Ensure schema is accessible

## API Endpoint

### GET /creator/videos/:id/thumbs

**Authentication**: Required (JWT)

**Path Parameter**: `id` (videoId)

**Response**:
```json
[
  {
    "id": "clx789",
    "bucket": "streamora-thumbs-dev",
    "objectKey": "thumbs/clx123/thumb_0.jpg",
    "isSelected": true,
    "timeSec": 3.0
  },
  {
    "id": "clx790",
    "bucket": "streamora-thumbs-dev",
    "objectKey": "thumbs/clx123/thumb_1.jpg",
    "isSelected": false,
    "timeSec": 12.0
  },
  ...
]
```

**Errors**:
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not owner of video
- Returns `[]` if no thumbnails found

## Day 7 LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] VideoThumbnail table created
- [ ] Worker dependencies installed
- [ ] Worker environment file created
- [ ] Pub/Sub subscription created
- [ ] GCS thumbs bucket created
- [ ] ffmpeg installed (local dev)
- [ ] Worker receives `video.uploaded` messages
- [ ] Worker downloads original from GCS
- [ ] ffprobe extracts metadata
- [ ] VideoAsset updated with duration/width/height
- [ ] 6 thumbnails generated
- [ ] Thumbnails uploaded to GCS
- [ ] VideoThumbnail records created
- [ ] Video.status = READY
- [ ] Thumbnails API returns data

## Troubleshooting

### Worker Not Receiving Messages

1. Check subscription exists:
   ```bash
   gcloud pubsub subscriptions list --project=YOUR_PROJECT
   ```

2. Check messages in subscription:
   ```bash
   gcloud pubsub subscriptions pull video-uploaded-dev-sub \
     --project=YOUR_PROJECT \
     --limit=1
   ```

3. Verify environment variables:
   - `PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED`
   - `GCP_PROJECT_ID`
   - `GOOGLE_APPLICATION_CREDENTIALS`

### ffmpeg/ffprobe Errors

- Ensure ffmpeg is installed: `ffmpeg -version`
- Check PATH includes ffmpeg
- For Docker: ffmpeg is included in Dockerfile

### Database Connection Errors

- Verify `DATABASE_URL` in `apps/worker/.env`
- Check Postgres is running: `docker ps`
- Test connection: `psql $DATABASE_URL`

### GCS Permission Errors

- Service account needs:
  - `Storage Object Viewer` (read originals)
  - `Storage Object Creator` (write thumbs)
- Grant on buckets or project level

## Next Steps

After Day 7 is locked:
- **Day 8**: HLS renditions (transcode + package)
- Worker will generate HLS playlists and segments
- Store in renditions bucket
