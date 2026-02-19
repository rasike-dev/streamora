# Day 5 Enhancements — Upload Progress Persistence & Resume

## Summary

Enhanced Day 5 with database-backed upload progress tracking and resume capability after page refresh.

## Changes Made

### 1. Database Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma` - `UploadIntent` model

**New fields**:
- `uploadedBytes BigInt @default(0)` - Tracks bytes uploaded
- `lastError String?` - Stores error message if failed
- `startedAt DateTime?` - When upload started
- `completedAt DateTime?` - When upload completed

### 2. API Endpoints ✅

#### GET /uploads/:id/status
- **Controller**: `uploads.status.controller.ts`
- **Returns**: Upload intent status, progress, error, timestamps
- **Auth**: JWT required, owner/admin only

#### POST /uploads/:id/progress
- **Controller**: `uploads.progress.controller.ts`
- **Updates**: `uploadedBytes`, `status`, `startedAt`
- **Throttled**: Called every ~1.2s during upload
- **Auth**: JWT required, owner/admin only

#### POST /uploads/:id/complete
- **Controller**: `uploads.complete.controller.ts`
- **Updates**: `status = COMPLETED`, `completedAt`, `uploadedBytes = sizeBytes`
- **Auth**: JWT required, owner/admin only

#### POST /uploads/:id/fail
- **Controller**: `uploads.fail.controller.ts`
- **Updates**: `status = FAILED`, `lastError`, `uploadedBytes`
- **Auth**: JWT required, owner/admin only

#### GET /creator/uploads
- **Controller**: `uploads.creator.controller.ts`
- **Returns**: List of user's in-progress/failed uploads
- **Auth**: JWT required

### 3. Web Updates ✅

#### Upload Helper Enhancement
- **Updated**: `apps/web/src/lib/resumableUpload.ts`
- **Added**: `onProgressBytes` callback for raw byte tracking

#### API Helper
- **Created**: `apps/web/src/lib/api.ts`
- **Purpose**: Centralized API fetch with auth token

#### Upload Manager Enhancements
- **Updated**: `apps/web/src/components/upload-manager.tsx`
- **Features**:
  - Persists progress to DB during upload (throttled)
  - Marks complete/failed in DB
  - Loads in-progress uploads on page load
  - Resume functionality (user selects file again)

## How It Works

### Progress Persistence

1. **During Upload**:
   - XHR progress events trigger `onProgressBytes`
   - Throttled to ~1.2s intervals
   - Calls `POST /uploads/:id/progress` with `uploadedBytes`

2. **On Success**:
   - Calls `POST /uploads/:id/complete`
   - Sets `status = COMPLETED`, `completedAt`, `uploadedBytes = sizeBytes`

3. **On Failure**:
   - Calls `POST /uploads/:id/fail` with error message
   - Sets `status = FAILED`, `lastError`, current `uploadedBytes`

### Resume After Refresh

1. **On Page Load**:
   - Calls `GET /creator/uploads`
   - Loads in-progress/failed uploads into UI
   - Shows status, progress, error message

2. **Resume Flow**:
   - User sees upload with status "In progress (select file to resume)"
   - User selects the same file
   - Click "Start" → Creates new session (same objectKey)
   - Upload continues from beginning (true byte-range resume is optional enhancement)

## Migration

### Run Prisma Migration

```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name day5_upload_progress
pnpm prisma generate
cd ../../
```

This adds the new fields to `UploadIntent` table.

## API Endpoints

### GET /uploads/:id/status

**Response**:
```json
{
  "id": "clx123abc",
  "videoId": "clx456def",
  "status": "UPLOADING",
  "bucket": "streamora-originals-dev",
  "objectKey": "originals/.../...mp4",
  "contentType": "video/mp4",
  "sizeBytes": "104857600",
  "uploadedBytes": "52428800",
  "percent": 50,
  "lastError": null,
  "startedAt": "2024-01-01T12:00:00Z",
  "completedAt": null,
  "updatedAt": "2024-01-01T12:01:00Z"
}
```

### POST /uploads/:id/progress

**Request**:
```json
{
  "uploadedBytes": 52428800,
  "status": "UPLOADING"
}
```

**Response**:
```json
{
  "ok": true
}
```

### POST /uploads/:id/complete

**Response**:
```json
{
  "ok": true
}
```

### POST /uploads/:id/fail

**Request**:
```json
{
  "error": "Network error",
  "uploadedBytes": 52428800
}
```

**Response**:
```json
{
  "ok": true
}
```

### GET /creator/uploads

**Response**:
```json
[
  {
    "id": "clx123abc",
    "videoId": "clx456def",
    "status": "UPLOADING",
    "objectKey": "originals/.../...mp4",
    "sizeBytes": "104857600",
    "uploadedBytes": "52428800",
    "percent": 50,
    "updatedAt": "2024-01-01T12:01:00Z",
    "lastError": null
  }
]
```

## Testing

### 1. Test Progress Persistence

1. Start an upload
2. Watch progress bar update
3. Check database:
   ```sql
   SELECT id, status, uploaded_bytes, updated_at 
   FROM "UploadIntent" 
   WHERE status = 'UPLOADING';
   ```
4. **Verify**: `uploaded_bytes` increments over time

### 2. Test Resume After Refresh

1. Start an upload (let it run for a bit)
2. Refresh the page
3. **Verify**: Upload appears in list with current progress
4. Select the same file
5. Click "Start" (Resume)
6. **Verify**: New session created, upload continues

### 3. Test Status Endpoint

```bash
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/uploads/{uploadIntentId}/status
```

**Expected**: Returns current status and progress

### 4. Test Complete Endpoint

After upload finishes:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/uploads/{uploadIntentId}/complete
```

**Verify**: Database shows `status = COMPLETED`, `completed_at` set

### 5. Test Fail Endpoint

Simulate failure:
```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"error": "Test error", "uploadedBytes": 1000}' \
  http://localhost:3001/uploads/{uploadIntentId}/fail
```

**Verify**: Database shows `status = FAILED`, `last_error` set

## Day 5 Enhancements LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] During upload, DB `UploadIntent.status = UPLOADING`
- [ ] `uploadedBytes` increments over time in DB
- [ ] `GET /uploads/{id}/status` returns correct percent
- [ ] On completion, `status = COMPLETED`, `completedAt` set
- [ ] After refresh, `/creator/uploads` shows in-progress/failed items
- [ ] Resume works (user selects file, creates new session)
- [ ] Progress persists across page refreshes

## Technical Details

### Progress Throttling

- **Interval**: ~1.2 seconds
- **Purpose**: Reduce API calls while maintaining accuracy
- **Implementation**: Closure with `lastAt` timestamp

### Resume Strategy

**Current (Simple)**:
- User selects file again
- New session created (same objectKey)
- Upload restarts from beginning

**Future Enhancement (True Resume)**:
- Query GCS for uploaded bytes
- Use `Content-Range: bytes {offset}-{end}/{total}`
- Resume from last uploaded byte

### Database Fields

- **uploadedBytes**: Tracks progress (0 → sizeBytes)
- **lastError**: Stores error message (max 1000 chars)
- **startedAt**: Set when upload starts
- **completedAt**: Set when upload completes

## Next Steps

After Day 5 Enhancements are locked:
- **Day 6**: Upload complete + video record + status model
- **Day 7**: Worker v1 (ffprobe + thumbnails)
