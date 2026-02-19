# Day 5 Resume Enhancement — Server-Side ObjectKey Reuse

## Summary

Enhanced resume functionality to reuse the same GCS objectKey when resuming an upload, providing a cleaner resume experience.

## Changes Made

### 1. API: Enhanced /uploads/init Endpoint ✅

**Updated**: `apps/api/src/uploads/uploads.controller.ts`

**New Request Body**:
```typescript
{
  videoId: string;
  filename: string;
  contentType: string;
  sizeBytes: number;
  uploadIntentId?: string; // Optional: for resume
}
```

**Behavior**:

#### If `uploadIntentId` is provided (Resume Path):
1. Validates upload intent exists
2. Validates it belongs to the `videoId`
3. Validates status is not `COMPLETED`
4. Validates ownership (user owns the video)
5. **Reuses existing `objectKey`**
6. Resets intent: `status = INITIATED`, `uploadedBytes = 0`, clears errors/timestamps
7. Creates new resumable session URL for the same objectKey

#### If not provided (New Upload Path):
1. Creates new objectKey (as before)
2. Creates new upload intent
3. Creates resumable session URL

### 2. Web: Pass uploadIntentId on Resume ✅

**Updated**: `apps/web/src/components/upload-manager.tsx`

**Change**: `initUpload()` now passes `uploadIntentId` when present:

```typescript
body: JSON.stringify({
  videoId: item.videoId,
  filename: item.file.name,
  contentType: item.file.type || "application/octet-stream",
  sizeBytes: item.file.size,
  uploadIntentId: item.uploadIntentId ?? undefined,
}),
```

## How It Works

### Resume Flow

1. **User refreshes page** → In-progress uploads load from DB
2. **User clicks "Resume"** → File picker opens
3. **User selects file** → File attached to item
4. **User clicks "Start"** → Calls `/uploads/init` with `uploadIntentId`
5. **Server validates** → Checks ownership, status, videoId match
6. **Server reuses objectKey** → Same GCS path as before
7. **Server creates new session** → New resumable URL for same objectKey
8. **Upload continues** → File uploads to same location

### Benefits

- **Same objectKey**: File goes to exact same GCS location
- **Clean resume**: No duplicate objects in GCS
- **Validation**: Ensures ownership and status before resume
- **Reset progress**: Starts fresh (uploadedBytes = 0)

## API Endpoint

### POST /uploads/init (Enhanced)

**Request** (New Upload):
```json
{
  "videoId": "clx123abc",
  "filename": "video.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600
}
```

**Request** (Resume):
```json
{
  "videoId": "clx123abc",
  "filename": "video.mp4",
  "contentType": "video/mp4",
  "sizeBytes": 104857600,
  "uploadIntentId": "clx456def"
}
```

**Response** (Same for both):
```json
{
  "uploadIntentId": "clx456def",
  "videoId": "clx123abc",
  "objectKey": "originals/clx123abc/1704067200000-a1b2c3d4.mp4",
  "bucket": "streamora-originals-dev",
  "resumableSessionUrl": "https://storage.googleapis.com/...",
  "expiresInSeconds": 3600
}
```

## Validation Rules

### Resume Path Validations

1. **uploadIntentId exists**: Intent must be found in DB
2. **videoId matches**: Intent must belong to provided videoId
3. **Not completed**: Status must not be `COMPLETED`
4. **Ownership**: User must own the video (uploaderId check)

### Error Responses

- `400 Bad Request`: "uploadIntentId not found"
- `400 Bad Request`: "uploadIntentId does not match videoId"
- `400 Bad Request`: "Upload already completed"
- `400 Bad Request`: "Not owner of this upload"

## Testing

### 1. Test Resume with Same ObjectKey

1. Start an upload (note the `uploadIntentId` from response)
2. Cancel or let it fail
3. Refresh page
4. Click "Resume" → Select file → Click "Start"
5. **Verify**: 
   - New session created
   - Same `objectKey` in response
   - Intent status reset to `INITIATED`
   - `uploadedBytes` reset to 0

### 2. Test Validation

**Test invalid uploadIntentId**:
```bash
curl -X POST http://localhost:3001/uploads/init \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "videoId": "valid-id",
    "filename": "test.mp4",
    "contentType": "video/mp4",
    "sizeBytes": 1000,
    "uploadIntentId": "invalid-id"
  }'
```

**Expected**: `400 Bad Request: uploadIntentId not found`

**Test wrong videoId**:
```bash
# Use uploadIntentId from different video
```

**Expected**: `400 Bad Request: uploadIntentId does not match videoId`

**Test completed upload**:
```bash
# Use uploadIntentId of completed upload
```

**Expected**: `400 Bad Request: Upload already completed`

### 3. Test ObjectKey Reuse

1. Start upload → Get `uploadIntentId` and `objectKey`
2. Cancel upload
3. Resume with same `uploadIntentId`
4. **Verify**: Response has same `objectKey`

## Database Changes

### Intent Reset on Resume

When resuming, the intent is reset:
- `status`: `INITIATED`
- `uploadedBytes`: `0`
- `lastError`: `null`
- `startedAt`: `null`
- `completedAt`: `null`
- `contentType`: Updated (if changed)
- `sizeBytes`: Updated (if changed)

## Day 5 Resume Enhancement LOCK Checklist ✅

- [x] `/uploads/init` accepts optional `uploadIntentId`
- [x] Resume path validates ownership and status
- [x] Resume path reuses existing `objectKey`
- [x] Resume path resets intent status and progress
- [x] Web passes `uploadIntentId` when resuming
- [x] Same objectKey used for resume uploads
- [x] Validation errors return appropriate messages

## Technical Details

### ObjectKey Reuse

- **Same path**: `originals/{videoId}/{timestamp}-{random}.{ext}`
- **GCS behavior**: New session URL overwrites existing object
- **No duplicates**: Clean resume without orphaned objects

### Status Reset

- **Why reset?**: Ensures clean state for resume
- **Progress reset**: `uploadedBytes = 0` (fresh start)
- **Error cleared**: `lastError = null`
- **Timestamps cleared**: `startedAt` and `completedAt` reset

### Future Enhancement

**True Byte-Offset Resume**:
- Query GCS for uploaded bytes: `HEAD` request to object
- Use `Content-Range: bytes {offset}-{end}/{total}`
- Resume from last uploaded byte
- More efficient for large files

## Next Steps

After Day 5 Resume Enhancement is locked:
- **Day 6**: Upload complete + video record + status model
- **Day 7**: Worker v1 (ffprobe + thumbnails)
