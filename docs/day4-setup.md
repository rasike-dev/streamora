# Day 4 — Direct-to-GCS Resumable Upload

## Summary

Implemented direct-to-GCS resumable upload functionality with upload intent tracking.

## Changes Made

### 1. Database Schema ✅

- **Added**: `UploadStatus` enum (INITIATED, UPLOADING, COMPLETED, FAILED)
- **Added**: `UploadIntent` model with:
  - videoId, objectKey, bucket, contentType, sizeBytes
  - status tracking
  - Relations to Video

### 2. GCS Service ✅

- **Created**: `apps/api/src/storage/gcs.service.ts`
- **Features**:
  - Google Cloud Storage client initialization
  - Bucket access helper

### 3. Uploads Controller ✅

- **Created**: `apps/api/src/uploads/uploads.controller.ts`
- **Endpoint**: `POST /uploads/init`
- **Features**:
  - Validates video ownership
  - Role-based file size limits (250MB for PENDING, 2GB for others)
  - Creates resumable upload session URL
  - Persists upload intent
  - Binds draft to uploader

### 4. Web Upload Page ✅

- **Created**: `apps/web/src/app/[locale]/upload/page.tsx`
- **Features**:
  - Video ID input
  - File selection
  - Single-shot PUT upload to GCS
  - Progress logging

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
pnpm install
```

This installs:
- `@google-cloud/storage` (for GCS operations)

### 2. Set Up GCP Credentials

#### A) Create GCS Bucket

```bash
# Using gcloud CLI
gsutil mb -p your-project-id gs://streamora-originals-dev
```

Or via GCP Console:
1. Go to Cloud Storage
2. Create bucket: `streamora-originals-dev`
3. Choose region (e.g., `us-central1`)

#### B) Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **Create Service Account**
3. Name: `streamora-uploader`
4. Grant role: **Storage Object Admin** (on the bucket)
5. Create and download JSON key

#### C) Set Environment Variables

Add to root `.env`:

```bash
GCP_PROJECT_ID=your-gcp-project-id
GCS_BUCKET_ORIGINALS=streamora-originals-dev
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
```

**Example**:
```bash
GCP_PROJECT_ID=my-streamora-project
GCS_BUCKET_ORIGINALS=streamora-originals-dev
GOOGLE_APPLICATION_CREDENTIALS=/Users/admin/Downloads/streamora-uploader-key.json
```

### 3. Run Prisma Migration

```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name day4_upload_intents
pnpm prisma generate
cd ../../
```

This will:
- Create `UploadIntent` table
- Generate Prisma Client with new types

### 4. Verify Migration

```bash
# Check table was created
docker exec -it streamora-postgres psql -U streamora -d streamora -c "\d \"UploadIntent\""
```

Should show the table structure.

## Testing

### 1. Create a Video Draft

```bash
# Login first, then create draft via dashboard
# Or use API:
curl -X POST http://localhost:3001/creator/videos/draft \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "locale": "en",
    "title": "Test Video"
  }'
```

Note the `videoId` from response.

### 2. Test Upload Init Endpoint

```bash
curl -X POST http://localhost:3001/uploads/init \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "YOUR_VIDEO_ID",
    "filename": "test.mp4",
    "contentType": "video/mp4",
    "sizeBytes": 1048576
  }'
```

**Expected response**:
```json
{
  "videoId": "...",
  "objectKey": "originals/.../...-....mp4",
  "bucket": "streamora-originals-dev",
  "resumableSessionUrl": "https://storage.googleapis.com/..."
}
```

### 3. Test Web Upload Page

1. Go to `http://localhost:3000/en/upload`
2. Paste video ID (from step 1)
3. Select a video file
4. Click "Start Upload"
5. Check logs for success message

### 4. Verify File in GCS

```bash
# List files in bucket
gsutil ls gs://streamora-originals-dev/originals/

# Or via GCP Console:
# Cloud Storage → streamora-originals-dev → originals/
```

## API Endpoints

### POST /uploads/init

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "videoId": "string",
  "filename": "string",
  "contentType": "string",
  "sizeBytes": number
}
```

**Response**:
```json
{
  "videoId": "string",
  "objectKey": "string",
  "bucket": "string",
  "resumableSessionUrl": "string"
}
```

**Errors**:
- `400 Bad Request`: Missing required fields
- `400 Bad Request`: User not found (call /me first)
- `400 Bad Request`: Video not found
- `400 Bad Request`: Not owner of video
- `400 Bad Request`: File too large for role
- `400 Bad Request`: Missing GCS_BUCKET_ORIGINALS env var

## File Size Limits

- **CREATOR_PENDING**: 250 MB max
- **Other roles**: 2 GB max

## Object Key Format

```
originals/{videoId}/{timestamp}-{random}.{ext}
```

Example:
```
originals/clx123abc/1704067200000-a1b2c3d4.mp4
```

## Day 4 LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] UploadIntent table exists
- [ ] GCS service account configured
- [ ] Environment variables set (GCP_PROJECT_ID, GCS_BUCKET_ORIGINALS, GOOGLE_APPLICATION_CREDENTIALS)
- [ ] POST /uploads/init returns resumableSessionUrl
- [ ] Browser upload succeeds (file appears in GCS)
- [ ] UploadIntent row created in DB
- [ ] Draft gets bound to uploader (Video.uploaderId set)

## Troubleshooting

### "Missing GCS_BUCKET_ORIGINALS env var"

Ensure `.env` has:
```bash
GCS_BUCKET_ORIGINALS=streamora-originals-dev
```

### "User not found in DB"

Call `/me` endpoint first to create user record:
```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/me
```

### "Not owner of this video"

- Video must be a draft you created
- Or video.uploaderId must match your user.id

### GCS Upload Fails

1. **Check service account permissions**:
   - Must have "Storage Object Admin" role
   - Or "Storage Admin" for full access

2. **Verify credentials path**:
   ```bash
   cat $GOOGLE_APPLICATION_CREDENTIALS
   # Should show JSON key file
   ```

3. **Test GCS connection**:
   ```bash
   gcloud auth activate-service-account --key-file=$GOOGLE_APPLICATION_CREDENTIALS
   gsutil ls gs://streamora-originals-dev/
   ```

### CORS Issues

If browser upload fails with CORS:
- GCS resumable upload should handle CORS automatically
- If issues persist, configure CORS on bucket:
  ```bash
  gsutil cors set cors.json gs://streamora-originals-dev
  ```

## Next Steps

After Day 4 is locked:
- **Day 5**: Upload complete + video record + status model
- **Day 6**: Upload complete + video record + status model (continued)
