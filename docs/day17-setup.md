# Day 17 — Scheduled Publishing

## Summary

Implemented scheduled publishing that allows creators to set future publication times for videos. The system automatically publishes APPROVED videos when their scheduled time arrives, while respecting the moderation-first architecture.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`
- Added `scheduledAt` field (DateTime, nullable)
- Added `publishedAt` field (DateTime, nullable)
- Added `scheduleRequested` field (Boolean, default: false)
- Kept existing `publishAt` field for backward compatibility

### 2. Backend: Schedule DTO ✅

**Created**: `apps/api/src/videos/dto/update-video-schedule.dto.ts`
- `UpdateVideoScheduleDto` with `scheduledAt` field (string | null)

### 3. Backend: Schedule Service ✅

**Created**: `apps/api/src/videos/video-schedule.service.ts`
- `updateSchedule()` - Updates video schedule
- Validates video ownership
- Validates editable statuses
- Validates scheduledAt is in the future
- Sets `scheduleRequested` flag

**Editable Statuses**:
- DRAFT
- READY
- PENDING_APPROVAL
- APPROVED

### 4. Backend: Schedule Controller ✅

**Created**: `apps/api/src/videos/video-schedule.controller.ts`
- `PATCH /creator/videos/:id/schedule` - Update schedule
- JWT authentication required

### 5. Scheduled Publisher Service ✅

**Created**: `apps/api/src/videos/scheduled-publisher.service.ts`
- Cron job runs every minute
- Publishes APPROVED videos where `scheduledAt <= now`
- Uses `updateMany` for concurrency safety
- Sets `scheduleRequested: false` after publishing

### 6. Admin Approval Update ✅

**Updated**: `apps/api/src/admin/admin.moderation.controller.ts`
- `approve()` method now checks if scheduled time has passed
- If `scheduledAt <= now`, publishes immediately
- Otherwise, sets status to APPROVED and waits for scheduler

### 7. App Module Updates ✅

**Updated**: `apps/api/src/app.module.ts`
- Added `ScheduleModule.forRoot()` import
- Registered `CreatorVideoScheduleController`
- Registered `CreatorVideoScheduleService` and `ScheduledPublisherService` as providers

### 8. Frontend: API Helper ✅

**Created**: `apps/web/src/lib/api/video-schedule.ts`
- `updateVideoSchedule()` - Updates schedule via API

### 9. Frontend: Schedule Editor Component ✅

**Created**: `apps/web/src/components/videos/VideoScheduleEditor.tsx`
- Datetime-local input for scheduling
- Save and Clear buttons
- Shows current scheduled time
- Status-aware (only editable in certain statuses)
- Loading and error states

### 10. Draft Editor Integration ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`
- Added `VideoScheduleEditor` component
- Shows schedule editor when video is editable
- Added `scheduledAt` and `scheduleRequested` to `VideoDraft` type

### 11. Dashboard Integration ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Shows scheduled time in video list when `scheduleRequested` is true

## Scheduling Rules Matrix

| Status | scheduledAt | Effect |
|--------|-------------|--------|
| DRAFT / READY / PENDING_APPROVAL | future | Saved, but no publication until approved |
| APPROVED | future | Auto-publish at scheduled time |
| APPROVED | past | Publish immediately (handled by approval) |
| PUBLISHED | any | Already live |
| REJECTED | any | Never auto-publish |
| TAKEDOWN / ARCHIVED | any | Never auto-publish |

## API Endpoints

### PATCH /creator/videos/:id/schedule

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "scheduledAt": "2026-03-15T14:30:00.000Z"
}
```

**Or to clear**:
```json
{
  "scheduledAt": null
}
```

**Response**:
```json
{
  "success": true,
  "videoId": "vid_123",
  "status": "APPROVED",
  "scheduledAt": "2026-03-15T14:30:00.000Z",
  "scheduleRequested": true
}
```

**Errors**:
- `404 Not Found`: Video not found or not owned by user
- `400 Bad Request`: Video schedule not editable in current status
- `400 Bad Request`: scheduledAt must be in the future

## Scheduler Behavior

### Cron Job
- Runs every minute (`@Cron(CronExpression.EVERY_MINUTE)`)
- Finds APPROVED videos where:
  - `scheduleRequested: true`
  - `scheduledAt <= now`
- Publishes them (status → PUBLISHED, sets `publishedAt`)
- Sets `scheduleRequested: false` after publishing

### Concurrency Safety
- Uses `updateMany` with guarded where clause
- Prevents duplicate publishing if multiple cron instances run

## Admin Approval Behavior

When admin approves a video:
1. Check if `scheduledAt` exists and `scheduledAt <= now`
2. If yes: Publish immediately (status → PUBLISHED, set `publishedAt`)
3. If no: Set status to APPROVED (scheduler will handle later)

This handles the case where approval happens after scheduled time.

## Timezone Handling

- **Storage**: All dates stored in UTC in database
- **UI**: Browser converts local datetime to ISO UTC before sending
- **Scheduler**: Compares against `new Date()` in UTC
- **Display**: Shows in user's local timezone

## Key Behavior Cases

### Case A: Schedule Before Approval
1. Creator sets `scheduledAt = tomorrow`
2. Video is `PENDING_APPROVAL`
3. Admin approves before tomorrow
4. Video becomes `APPROVED` with schedule
5. Scheduler publishes at scheduled time

### Case B: Approval After Scheduled Time
1. Creator sets `scheduledAt = yesterday`
2. Video stays `PENDING_APPROVAL`
3. Admin approves now
4. Video publishes immediately (approval logic handles it)

### Case C: Clear Schedule
1. Creator clears schedule
2. Video remains `APPROVED`
3. No auto-publish occurs
4. Admin can publish manually later

## UI Features

### Schedule Editor
- Datetime-local input (browser native picker)
- Save Schedule button
- Clear Schedule button
- Shows current scheduled time
- Status-aware editing (disabled when not editable)
- Visual feedback for saved state

### Dashboard Display
- Shows scheduled time badge when `scheduleRequested: true`
- Format: "Scheduled: {localized datetime}"

## Testing Checklist

### 1. Set Schedule
- [ ] PATCH /creator/videos/:id/schedule with future date
- [ ] Verify `scheduledAt` and `scheduleRequested` are set
- [ ] Verify past dates are rejected
- [ ] Verify invalid dates are rejected

### 2. Clear Schedule
- [ ] PATCH /creator/videos/:id/schedule with null
- [ ] Verify `scheduledAt` is cleared
- [ ] Verify `scheduleRequested` is false

### 3. Scheduler Behavior
- [ ] Set APPROVED video to near-future time
- [ ] Wait for cron tick (1 minute)
- [ ] Verify video becomes PUBLISHED
- [ ] Verify `publishedAt` is set
- [ ] Verify `scheduleRequested` is false

### 4. Admin Approval with Schedule
- [ ] Set schedule for PENDING_APPROVAL video
- [ ] Admin approves
- [ ] Verify status becomes APPROVED (not PUBLISHED if future)
- [ ] Set schedule in past for PENDING_APPROVAL video
- [ ] Admin approves
- [ ] Verify status becomes PUBLISHED immediately

### 5. Visibility Integration
- [ ] Scheduled video with PUBLIC visibility
- [ ] After publish, verify it appears in listings
- [ ] Scheduled video with UNLISTED visibility
- [ ] After publish, verify it's accessible by direct URL only

### 6. UI Flow
- [ ] Schedule editor appears in draft editor
- [ ] Can set future schedule
- [ ] Can clear schedule
- [ ] Dashboard shows scheduled time
- [ ] Schedule persists after page refresh

## Day 17 LOCK Checklist ✅

- [x] Video model has schedule fields (scheduledAt, publishedAt, scheduleRequested)
- [x] Creator can set future schedule (PATCH endpoint)
- [x] Creator can clear schedule (same endpoint with null)
- [x] Scheduler publishes due approved videos (cron job)
- [x] Approval handles overdue schedules (publish immediately)
- [x] Public visibility remains gated by PUBLISHED
- [x] Schedule editor UI component created
- [x] Draft editor integration complete
- [x] Dashboard shows schedule info

## Migration Required

After implementing Day 17, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_scheduled_publishing
pnpm prisma generate
```

This migration will:
- Add `scheduledAt` column (nullable DateTime)
- Add `publishedAt` column (nullable DateTime)
- Add `scheduleRequested` column (Boolean, default: false)

## Package Installation Required

Install NestJS schedule module:

```bash
cd apps/api
pnpm add @nestjs/schedule
```

## Notes

- **Moderation First**: Scheduled publishing does not bypass approval. Videos must be APPROVED before scheduler can publish them.
- **Concurrency**: Uses `updateMany` with guarded where clause for safety
- **Timezone**: All dates stored in UTC, UI handles conversion
- **Audit Trail**: `scheduledAt` is preserved after publishing for history
- **Status Model**: No separate SCHEDULED status - uses APPROVED + schedule fields

## Future Enhancements

- **Distributed Lock**: For multi-instance deployments
- **Outbox Events**: Publish event when auto-publish happens
- **Notifications**: Notify creator when scheduled publish succeeds
- **Failed Job Tracking**: Track failed schedule jobs
- **Admin UI**: Filter for "scheduled pending publish" videos
- **Validation**: Min/max lead time rules (optional)

## Next Steps

After Day 17 is locked:
- **Day 18**: Comments System
- **Day 19**: Search & Discovery
- **Day 20**: Analytics Dashboard
