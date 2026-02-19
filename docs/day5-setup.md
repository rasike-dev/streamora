# Day 5 — Premium Upload UX (Progress, Cancel, Retry)

## Summary

Implemented premium upload experience with progress tracking, cancel functionality, retry capability, and role-based quota checks.

## Changes Made

### 1. API: Upload Limits Endpoint ✅

- **Created**: `apps/api/src/uploads/uploads.limits.controller.ts`
- **Endpoint**: `GET /uploads/limits`
- **Returns**:
  - `maxBytes`: Role-based file size limit (250MB for PENDING, 2GB for others)
  - `maxDailyMinutes`: Daily upload minutes limit (placeholder)
  - `allowedTypes`: Allowed MIME types

### 2. API: Improved /uploads/init Response ✅

- **Updated**: `apps/api/src/uploads/uploads.controller.ts`
- **Added to response**:
  - `uploadIntentId`: ID of created upload intent
  - `expiresInSeconds`: Session URL expiration hint

### 3. Web: Resumable Upload Helper ✅

- **Created**: `apps/web/src/lib/resumableUpload.ts`
- **Features**:
  - Uses XMLHttpRequest for progress tracking
  - Returns promise and cancel function
  - Handles progress events
  - Proper error handling

### 4. Web: Upload Manager Component ✅

- **Created**: `apps/web/src/components/upload-manager.tsx`
- **Features**:
  - Multiple file upload queue
  - Real-time progress bars (0-100%)
  - Cancel functionality
  - Retry failed uploads
  - Role-based quota display
  - Status tracking (idle, initializing, uploading, done, failed, cancelled)

### 5. Web: Updated Upload Page ✅

- **Updated**: `apps/web/src/app/[locale]/upload/page.tsx`
- **Changes**:
  - Uses UploadManager component
  - Cleaner, simpler page structure

### 6. Navigation Update ✅

- **Updated**: `apps/web/src/app/[locale]/page.tsx`
- **Added**: Link to upload page from home

## Features

### Progress Tracking

- Real-time upload progress (0-100%)
- Visual progress bar
- Percentage display

### Cancel Functionality

- Cancel button during upload
- Aborts XMLHttpRequest
- Updates status to "cancelled"

### Retry Functionality

- Retry button for failed uploads
- Creates new upload session
- Resets progress and status

### Role-Based Quotas

- **CREATOR_PENDING**: 250 MB max
- **Other roles**: 2 GB max
- Displayed in UI before upload
- Client-side validation (server also enforces)

### Upload Queue

- Multiple files can be queued
- Each file has independent status
- Can start/cancel/retry individually

## API Endpoints

### GET /uploads/limits

**Authentication**: Required (JWT)

**Response**:
```json
{
  "maxBytes": 262144000,
  "maxDailyMinutes": 30,
  "allowedTypes": [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "application/octet-stream"
  ]
}
```

### POST /uploads/init (Updated)

**Response** (now includes):
```json
{
  "uploadIntentId": "clx123abc",
  "videoId": "clx456def",
  "objectKey": "originals/.../...mp4",
  "bucket": "streamora-originals-dev",
  "resumableSessionUrl": "https://storage.googleapis.com/...",
  "expiresInSeconds": 3600
}
```

## Testing

### 1. Test Limits Endpoint

```bash
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/uploads/limits
```

**Expected**: Returns role-based limits

### 2. Test Upload with Progress

1. Go to `http://localhost:3000/en/upload`
2. Enter video draft ID
3. Select a video file
4. Click "Start"
5. **Verify**:
   - Progress bar updates in real-time
   - Percentage increases (0% → 100%)
   - Status shows "UPLOADING" → "DONE"

### 3. Test Cancel

1. Start an upload
2. Click "Cancel" while uploading
3. **Verify**:
   - Upload stops immediately
   - Status changes to "CANCELLED"
   - Progress bar freezes

### 4. Test Retry

1. Start an upload that fails (or cancel it)
2. Click "Retry"
3. **Verify**:
   - New upload session created
   - Progress resets to 0%
   - Upload starts again

### 5. Test Quota Enforcement

**As CREATOR_PENDING**:
1. Try uploading file > 250MB
2. **Verify**: Error message "File too large. Max: 250 MB"

**As other role**:
1. Try uploading file > 2GB
2. **Verify**: Error message "File too large. Max: 2048 MB"

## Day 5 LOCK Checklist ✅

- [ ] `GET /uploads/limits` returns role-based max size
- [ ] Upload UI shows progress (0→100%)
- [ ] Cancel stops upload immediately
- [ ] Retry creates new session and succeeds
- [ ] Server rejects oversized files (400 with message)
- [ ] Multiple files can be queued
- [ ] Each file has independent status/progress

## UI Components

### Upload Manager

- **Video Draft ID input**: Paste video ID from dashboard
- **File selector**: Choose video files
- **Quota display**: Shows max size for current role
- **Upload queue**: List of files with status
- **Progress bars**: Visual progress for each file
- **Action buttons**: Start, Cancel, Retry

### Status States

- **idle**: File added, ready to start
- **initializing**: Creating upload session
- **uploading**: File uploading to GCS
- **done**: Upload completed successfully
- **failed**: Upload failed (can retry)
- **cancelled**: Upload was cancelled

## Technical Details

### XMLHttpRequest vs Fetch

- **Why XHR?**: `fetch()` API doesn't support upload progress
- **XHR**: `xhr.upload.onprogress` provides real-time progress
- **Cancel**: `xhr.abort()` immediately stops upload

### Progress Calculation

```typescript
const percent = Math.round((e.loaded / e.total) * 100);
```

### Session URL Expiration

- GCS resumable session URLs are valid for ~1 hour
- `expiresInSeconds: 3600` is a hint for UI
- If expired, retry creates a new session

## Next Steps

After Day 5 is locked:
- **Day 6**: Upload complete + video record + status model
- **Day 7**: Worker v1 (ffprobe + thumbnails)
