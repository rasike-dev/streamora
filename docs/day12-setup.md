# Day 12 — Stabilization: Quotas, Retries, Logs, Jobs View

## Summary

Implemented production-safety features including daily upload quotas, processing job tracking, correlation IDs for request tracing, structured logging, and an admin jobs view for failed processing. This separates system failures from moderation rejections.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added**: `PROCESSING_FAILED` to `VideoStatus` enum
- Separates system processing failures from moderation rejections

**Added**: `JobStatus` enum
- `PENDING`, `RUNNING`, `FAILED`, `SUCCEEDED`

**Added**: `ProcessingJob` model
- Tracks processing jobs with status, attempts, errors, correlation IDs
- Links to Video via foreign key
- Indexed on `videoId` and `status`

**Updated**: `Video` model
- Added `jobs ProcessingJob[]` relation

### 2. Request Correlation ID Middleware ✅

**Created**: `apps/api/src/common/request-id.middleware.ts`
- Generates or accepts `x-request-id` header
- Attaches `requestId` to request object
- Sets `x-request-id` in response headers
- Applied to all routes via `AppModule`

### 3. Structured Logging ✅

**Updated**: Key upload endpoints with structured logging
- `uploads/init` - Logs videoId, userSub, daily upload count
- `uploads/:id/complete` - Logs start and success with correlation ID
- `uploads/:id/fail` - Logs failure with error details
- `creator/videos/draft` - Logs draft creation

**Format**: `[requestId] endpoint action { context }`

### 4. Daily Upload Quota Enforcement ✅

**Updated**: `apps/api/src/uploads/uploads.controller.ts`
- Checks daily upload count per user
- **CREATOR_PENDING**: Max 5 uploads per day
- **CREATOR_APPROVED**: Max 100 uploads per day
- Counts uploads from start of day (00:00:00)
- Includes `INITIATED`, `UPLOADING`, `COMPLETED` statuses
- Throws `BadRequestException` if limit reached

### 5. Worker Processing Job Tracking ✅

**Updated**: `apps/worker/src/worker.ts`

**Job Creation**:
- Creates `ProcessingJob` row at processing start
- Sets status to `RUNNING`
- Includes correlation ID from event or generates one
- Links to video and upload intent

**Duplicate Prevention**:
- Checks for existing `RUNNING` job for same video
- Skips processing if duplicate detected
- Marks skipped job as `FAILED` with "Duplicate job detected"

**Success Handling**:
- Updates job status to `SUCCEEDED`
- Sets `completedAt` timestamp
- Clears `lastError`

**Failure Handling**:
- Updates job status to `FAILED`
- Stores error message (truncated to 2000 chars)
- Increments attempts counter
- Sets video status to `PROCESSING_FAILED` (not `REJECTED`)

### 6. Correlation ID in Pub/Sub ✅

**Updated**: `apps/api/src/uploads/uploads.complete-v2.controller.ts`
- Includes `correlationId: req.requestId` in Pub/Sub event
- Worker extracts correlation ID from event
- Enables tracing from API request → worker job

### 7. Admin Jobs View ✅

**Created**: `apps/api/src/admin/admin.jobs.controller.ts`
- **Endpoint**: `GET /admin/jobs?status=FAILED`
- Returns failed processing jobs with:
  - Video title
  - Job type, status, attempts
  - Error message
  - Correlation ID
  - Timestamps
- Requires ADMIN or MODERATOR role

**Created**: `apps/web/src/app/[locale]/admin/jobs/page.tsx`
- Displays failed jobs list
- Shows error messages and correlation IDs
- Links from admin dashboard

## Database Migration

**Required**: Run Prisma migration

```bash
cd apps/api
pnpm prisma migrate dev --name day12_jobs_and_processing_failed
pnpm prisma generate
cd ../../
```

**Note**: This migration adds:
- `PROCESSING_FAILED` to `VideoStatus` enum
- `JobStatus` enum
- `ProcessingJob` table
- `jobs` relation on `Video` table

## API Endpoints

### Admin Jobs

**GET /admin/jobs?status=FAILED**
- Returns failed processing jobs
- Query param `status` (default: `FAILED`)
- Requires: ADMIN or MODERATOR role

**Response**:
```json
[
  {
    "id": "clx123",
    "videoId": "clx456",
    "videoTitle": "My Video",
    "jobType": "THUMBS_HLS",
    "status": "FAILED",
    "attempts": 1,
    "lastError": "ffmpeg error: ...",
    "correlationId": "req-abc123",
    "startedAt": "2024-01-01T00:00:00Z",
    "completedAt": "2024-01-01T00:01:00Z",
    "createdAt": "2024-01-01T00:00:00Z"
  }
]
```

## Quota Limits

| Role | Max Uploads/Day | Max File Size |
|------|----------------|---------------|
| CREATOR_PENDING | 5 | 250 MB |
| CREATOR_APPROVED | 100 | 2 GB |

**Note**: Quota resets at midnight (00:00:00) local time.

## Correlation IDs

**Purpose**: Trace requests across API and worker logs

**Flow**:
1. API request → Middleware generates/accepts `x-request-id`
2. API logs include `[requestId]`
3. Pub/Sub event includes `correlationId: requestId`
4. Worker extracts correlation ID from event
5. Worker logs and job rows include correlation ID

**Usage**:
- Search logs by correlation ID
- Trace request → job → completion/failure
- Debug processing issues

## Video Status Flow (Updated)

```
UPLOADED → PROCESSING → [PENDING_APPROVAL | APPROVED] → PUBLISHED
                ↓
        PROCESSING_FAILED (system error, not moderation)
```

**Key Change**: `PROCESSING_FAILED` is separate from `REJECTED` (moderation).

## Testing

### 1. Test Daily Quota

1. Login as **CREATOR_PENDING** user
2. Upload 5 videos (should succeed)
3. Try to upload 6th video
4. **Verify**: Error "Daily upload limit reached (5)"

### 2. Test Processing Job Tracking

1. Upload a video
2. Wait for processing to start
3. **Verify**: `ProcessingJob` row created with status `RUNNING`
4. Wait for completion
5. **Verify**: Job status updated to `SUCCEEDED`

### 3. Test Processing Failure

1. Upload a video
2. Simulate worker failure (or wait for real failure)
3. **Verify**:
   - Job status is `FAILED`
   - Video status is `PROCESSING_FAILED` (not `REJECTED`)
   - Error message stored in `lastError`

### 4. Test Correlation IDs

1. Upload a video
2. Check API response headers for `x-request-id`
3. Check API logs for `[requestId]` entries
4. Check Pub/Sub event for `correlationId`
5. Check worker job row for `correlationId`
6. **Verify**: All IDs match

### 5. Test Admin Jobs View

1. Login as ADMIN
2. Go to `/en/admin/jobs`
3. **Verify**: Failed jobs displayed with error messages
4. **Verify**: Correlation IDs visible

### 6. Test Duplicate Prevention

1. Upload a video
2. Manually trigger duplicate Pub/Sub event (or wait for retry)
3. **Verify**: Second job marked as `FAILED` with "Duplicate job detected"
4. **Verify**: Only one job actually processes

## Day 12 LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] `PROCESSING_FAILED` status exists in database
- [ ] `ProcessingJob` table created
- [ ] API responses include `x-request-id` header
- [ ] Upload init enforces daily quota (5 for pending, 100 for approved)
- [ ] Worker creates `ProcessingJob` rows
- [ ] Worker failures set video to `PROCESSING_FAILED` (not `REJECTED`)
- [ ] Failed jobs visible in `/admin/jobs`
- [ ] Correlation IDs flow from API → Pub/Sub → Worker
- [ ] Structured logging works in key endpoints

## Manual Verification Required

### 1. Run Prisma Migration

```bash
cd apps/api
pnpm prisma migrate dev --name day12_jobs_and_processing_failed
pnpm prisma generate
cd ../../
```

**Important**: This migration modifies the `VideoStatus` enum and adds a new table. Make sure to:
- Review the migration SQL before applying
- Backup database if in production
- Test migration on dev/staging first

### 2. Verify Worker Has Prisma Client

The worker needs `@prisma/client` to access the new `ProcessingJob` model:

```bash
cd apps/worker
pnpm add @prisma/client
cd ../../
```

**Note**: The worker should already have this from Day 7, but verify it's installed.

### 3. Test Quota Enforcement

After migration:
1. Create a test user with `CREATOR_PENDING` role
2. Upload 5 videos (should all succeed)
3. Try 6th upload (should fail with quota error)
4. Wait until next day or manually adjust quota logic for testing

### 4. Verify Correlation IDs

Check logs after an upload:
1. API logs should show `[requestId]` entries
2. Pub/Sub event should include `correlationId`
3. Worker job should have matching `correlationId`
4. All should be traceable end-to-end

### 5. Test Processing Failure Path

To test failure handling:
1. Upload a video
2. Manually break worker (e.g., invalid GCS path, missing ffmpeg)
3. Verify job marked as `FAILED`
4. Verify video status is `PROCESSING_FAILED`
5. Check admin jobs view shows the failure

## Next Steps

After Day 12 is locked:
- **Day 13**: Proper Drafts + Metadata Editor (enhancements)
- **Day 14**: Bulk Upload Manager
- **Day 15**: Thumbnail Picker + Custom Thumbnail Upload

## Notes

- Quota is based on upload count, not file size or duration (can be enhanced later)
- Correlation IDs help with debugging but don't require special infrastructure
- Processing jobs are created for every processing attempt
- Duplicate prevention is basic but effective for most cases
- `PROCESSING_FAILED` videos can be manually retried later (future feature)
