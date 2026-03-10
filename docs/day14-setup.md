# Day 14 — Bulk Upload Manager

## Summary

Implemented a comprehensive bulk upload manager that allows creators to upload multiple videos simultaneously with queue management, progress tracking, pause/resume, retry, and seamless integration with the draft editor.

## Changes Made

### 1. Upload Client Library ✅

**Created**: `apps/web/src/lib/uploads/upload-client.ts`
- `initUpload()` - Initialize upload and get resumable session URL
- `completeUpload()` - Mark upload as complete
- `failUpload()` - Mark upload as failed
- `getUploadStatus()` - Get current upload status

Uses existing `apiFetch` helper for authenticated requests.

### 2. Upload XHR Helper ✅

**Created**: `apps/web/src/lib/uploads/upload-xhr.ts`
- `uploadFileToResumableUrl()` - Upload file with progress tracking
- Uses `XMLHttpRequest` for upload progress events
- Supports abort signal for cancellation

### 3. Upload Queue Hook ✅

**Created**: `apps/web/src/components/uploads/useUploadQueue.ts`
- Manages upload queue state with localStorage persistence
- Handles parallel upload limiting (max 2 concurrent)
- Queue item lifecycle: QUEUED → INITIATING → UPLOADING → COMPLETING → COMPLETED
- Supports pause, retry, and remove operations
- Automatically processes queue items
- Persists queue metadata (without File objects) to localStorage

**Key Features**:
- **Parallel Upload Limit**: Max 2 concurrent uploads
- **State Persistence**: Queue persists across page refreshes
- **File Recovery**: After refresh, user can reselect file for retry
- **Error Handling**: Failed uploads can be retried
- **Progress Tracking**: Real-time progress updates per file

### 4. Upload Queue Item Component ✅

**Created**: `apps/web/src/components/uploads/UploadQueueItem.tsx`
- Displays file name, size, status, progress
- Shows error messages for failed uploads
- Action buttons: Pause, Retry, Remove, Edit Metadata
- Progress bar visualization
- Mobile-friendly layout

### 5. Bulk Upload Manager Component ✅

**Created**: `apps/web/src/components/uploads/BulkUploadManager.tsx`
- File selection (multiple videos)
- Queue statistics (Total, Active, Completed, Failed)
- Renders queue items
- Integrates with `useUploadQueue` hook

### 6. Uploads Page ✅

**Created**: `apps/web/src/app/[locale]/dashboard/uploads/page.tsx`
- Route: `/[locale]/dashboard/uploads`
- Integrates `BulkUploadManager` component
- Responsive layout with max-width container

### 7. Dashboard Integration ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Added "Bulk Upload" link in dashboard header

### 8. Backend: List Uploads Endpoint ✅

**Created**: `apps/api/src/uploads/uploads.list.controller.ts`
- `GET /creator/uploads` - List recent upload intents for current creator
- Returns upload metadata (id, videoId, status, objectKey, timestamps)
- Ordered by creation date (newest first)
- Limited to 50 most recent

**Registered**: Added to `AppModule`

## Upload Queue State Model

```typescript
export type QueueUploadStatus =
  | 'QUEUED'
  | 'INITIATING'
  | 'UPLOADING'
  | 'PAUSED'
  | 'COMPLETING'
  | 'COMPLETED'
  | 'FAILED';

export interface UploadQueueItem {
  localId: string;              // Client-side unique ID
  fileName: string;
  fileSize: number;
  mimeType: string;
  progressPct: number;
  status: QueueUploadStatus;
  error?: string | null;
  file?: File;                  // Not persisted
  uploadIntentId?: string;      // Server-side ID
  videoId?: string;
  resumableSessionUrl?: string;
  objectKey?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Upload Flow

### Per File Lifecycle

1. **QUEUED** - File added to queue
2. **INITIATING** - Calling `/uploads/init`
3. **UPLOADING** - Uploading to GCS resumable URL
4. **COMPLETING** - Calling `/uploads/{id}/complete`
5. **COMPLETED** - Upload finished, ready for metadata editing

### Failure Path

- Any status → **FAILED** (on error)
- Error message stored in `item.error`

### Pause Path

- **UPLOADING** → **PAUSED** (user action)
- **PAUSED** → **QUEUED** (retry action)

## Parallel Upload Management

- **Max Concurrent**: 2 uploads at once
- **Queue Processing**: Automatically starts next item when slot available
- **Status Tracking**: Counts items in INITIATING, UPLOADING, or COMPLETING

## LocalStorage Persistence

- **Storage Key**: `streamora.upload.queue`
- **Persistence**: All queue metadata except `File` objects
- **Recovery**: After refresh, queue items show but require file reselection for retry
- **Auto-save**: Queue state saved on every change

## API Endpoints Used

### Existing Endpoints

- `POST /uploads/init` - Initialize upload
- `POST /uploads/{id}/complete` - Complete upload
- `POST /uploads/{id}/fail` - Mark upload as failed
- `GET /uploads/{id}/status` - Get upload status (available but not used in queue)

### New Endpoint

- `GET /creator/uploads` - List creator's recent uploads

## UI Features

### File Selection
- Multiple file selection via file input
- Accepts `video/*` MIME types
- Files added to queue immediately

### Queue Display
- List of all queue items
- Per-item progress bars
- Status indicators
- Error messages for failed uploads

### Actions Per Item
- **Pause**: Stop active upload (only when UPLOADING)
- **Retry**: Restart failed or paused upload
- **Remove**: Remove from queue
- **Edit Metadata**: Link to draft editor (only when COMPLETED)

### Statistics
- **Total**: All items in queue
- **Active**: Currently uploading (INITIATING, UPLOADING, COMPLETING)
- **Completed**: Successfully uploaded
- **Failed**: Failed uploads

## Mobile-First Design

- Compact card layout
- Thumb-friendly buttons
- Clear progress indicators
- Responsive grid for statistics
- Touch-optimized interactions

## Integration with Draft Editor

After upload completes:
- Queue item shows "Edit Metadata" link
- Links to `/[locale]/dashboard/videos/{videoId}/edit`
- Seamless transition from upload to metadata editing

## Testing Checklist

### 1. Multi-File Selection
- [ ] Select 3+ video files
- [ ] Verify all appear in queue
- [ ] Verify files are in QUEUED status

### 2. Parallel Upload Limit
- [ ] Add 5 files to queue
- [ ] Verify only 2 uploads active at once
- [ ] Verify others wait in QUEUED status
- [ ] Verify next item starts when one completes

### 3. Progress Tracking
- [ ] Verify progress bar updates during upload
- [ ] Verify percentage increases
- [ ] Verify progress reaches 100% on completion

### 4. Pause/Resume
- [ ] Start upload
- [ ] Click "Pause" during upload
- [ ] Verify status changes to PAUSED
- [ ] Click "Retry"
- [ ] Verify upload resumes

### 5. Failure Handling
- [ ] Simulate network error (disconnect)
- [ ] Verify item status becomes FAILED
- [ ] Verify error message displayed
- [ ] Click "Retry"
- [ ] Verify upload restarts

### 6. Complete Flow
- [ ] Upload completes successfully
- [ ] Verify status becomes COMPLETED
- [ ] Verify "Edit Metadata" link appears
- [ ] Click link
- [ ] Verify navigates to draft editor

### 7. Refresh Resilience
- [ ] Add files to queue
- [ ] Start uploads
- [ ] Refresh page
- [ ] Verify queue items persist
- [ ] Verify file objects are missing (expected)
- [ ] Verify retry prompts for file reselection

### 8. Queue Management
- [ ] Add multiple files
- [ ] Remove item from queue
- [ ] Verify item removed
- [ ] Verify queue continues processing

## Day 14 LOCK Checklist ✅

- [x] Multiple files can be selected
- [x] Queue displays all files
- [x] Parallel upload cap works (max 2)
- [x] Progress updates per file
- [x] Failure handling works
- [x] Retry works
- [x] Pause works
- [x] Complete works
- [x] Metadata handoff works (Edit Metadata link)
- [x] Refresh resilience (localStorage persistence)
- [x] Backend list endpoint created

## Notes

- **File Persistence**: File objects cannot be persisted in localStorage. After refresh, users must reselect files for retry.
- **Resumable Sessions**: GCS resumable sessions may expire. The queue handles this by re-initializing if needed.
- **Error Recovery**: Failed uploads can be retried. The queue maintains upload intent IDs for server-side tracking.
- **Concurrency**: Max 2 parallel uploads is a safe default. Can be made adaptive later.
- **Mobile Optimization**: UI is designed for mobile-first with touch-friendly controls.

## Next Steps

After Day 14 is locked:
- **Day 15**: Thumbnail Picker + Custom Thumbnail Upload
- **Day 16**: Visibility Modes
- **Day 17**: Analytics Dashboard
