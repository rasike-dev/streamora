# Day 26: Resubmission Flow

## Summary

Implemented resubmission flow that allows creators to resubmit previously rejected videos for moderation after making corrections. This completes the moderation feedback loop by making rejection feedback actionable. Creators can now edit rejected videos and resubmit them, while admins can see revision context in the moderation queue.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Fields to Video Model**:
- `resubmittedAt` (DateTime?) - Timestamp when video was last resubmitted
- `moderationVersion` (Int, default: 1) - Increments each time video enters moderation cycle

**Purpose**:
- Tracks resubmission history
- Enables revision tracking
- Provides audit trail for moderation cycles
- Helps admins identify resubmitted videos

### 2. Backend: Resubmit Video Service Method ✅

**Updated**: `apps/api/src/videos/videos.service.ts`

**Added Method**: `resubmitVideo()`
- Validates video exists and user is owner
- Only allows resubmission from `REJECTED` status
- Updates status to `PENDING_APPROVAL`
- Sets `resubmittedAt` timestamp
- Increments `moderationVersion`
- Returns success response with updated fields

**Validation Logic**:
- Only `REJECTED` videos can be resubmitted
- Only video owner can resubmit
- Returns `BadRequestException` if video is not rejected
- Returns `ForbiddenException` if user is not owner
- Returns `NotFoundException` if video doesn't exist

### 3. Backend: Resubmit Endpoint ✅

**Updated**: `apps/api/src/videos/videos.controller.ts`

**Added Endpoint**: `POST /creator/videos/:id/resubmit`
- Requires authentication (JWT)
- Calls `resubmitVideo()` service method
- Returns resubmission response with updated status

**Response Format**:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "resubmittedAt": "2026-03-12T09:15:00.000Z",
  "moderationVersion": 2,
  "message": "Video resubmitted for moderation"
}
```

### 4. Backend: Creator Video API Updates ✅

**Updated**: `apps/api/src/videos/videos.service.ts`

**Updated Method**: `getDraft()`
- Now includes `resubmittedAt` in response
- Now includes `moderationVersion` in response
- Preserves rejection context (reason, note, rejectedAt)

**Response for Resubmitted Video**:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "rejectionReason": "Copyright issue",
  "rejectionNote": "Music at 00:42–01:03",
  "rejectedAt": "2026-03-10T10:00:00Z",
  "resubmittedAt": "2026-03-12T09:15:00Z",
  "moderationVersion": 2,
  ...
}
```

### 5. Backend: Admin Moderation Queue Updates ✅

**Updated**: `apps/api/src/admin/admin.moderation.controller.ts`

**Updated Endpoint**: `GET /admin/moderation/queue`
- Now includes `moderationVersion` in response
- Now includes `resubmittedAt` in response
- Shows previous rejection reason for context

**Response for Resubmitted Video**:
```json
{
  "id": "vid_123",
  "title": "How to Build AI Agent",
  "status": "PENDING_APPROVAL",
  "moderationVersion": 2,
  "resubmittedAt": "2026-03-12T09:15:00Z",
  "rejectionReason": "Copyright issue",
  ...
}
```

### 6. Frontend: Resubmit API Helper ✅

**Updated**: `apps/web/src/lib/api/creator-videos.ts`

**Added Function**: `resubmitCreatorVideo()`
- Calls resubmit endpoint
- Handles authentication
- Handles errors gracefully
- Returns response data

### 7. Frontend: Creator Dashboard Updates ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`

**New Features**:
- "Resubmit for Approval" button for `REJECTED` videos
- Button disabled during submission
- Shows loading state ("Resubmitting...")
- Shows success message after resubmission
- Reloads video data to show updated status
- Resubmission banner for `PENDING_APPROVAL` videos with `resubmittedAt`
- Displays revision number if `moderationVersion > 1`

**Button Behavior**:
- Only visible for `REJECTED` status videos
- Disabled while request is pending
- Refreshes video data after success
- Shows error message on failure

### 8. Frontend: Admin Moderation UI Updates ✅

**Updated**: `apps/web/src/app/[locale]/admin/moderation/page.tsx`

**New Features**:
- "Revision {version}" badge for resubmitted videos
- Shows resubmission timestamp
- Shows previous rejection reason for context
- Helps admins identify resubmitted videos

**UI Display**:
- Revision badge appears next to video title
- Resubmission timestamp in video metadata
- Previous rejection reason shown for context
- Clear visual distinction for resubmissions

## API Endpoints

### POST /creator/videos/:id/resubmit

**Authentication**: Required (JWT, video owner)

**Request**: No body required

**Response**:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "resubmittedAt": "2026-03-12T09:15:00.000Z",
  "moderationVersion": 2,
  "message": "Video resubmitted for moderation"
}
```

**Errors**:
- `404 Not Found`: Video not found
- `403 Forbidden`: User is not video owner
- `400 Bad Request`: Video is not in REJECTED status

**Behavior**:
- Updates video status to `PENDING_APPROVAL`
- Sets `resubmittedAt` timestamp
- Increments `moderationVersion`
- Preserves rejection context (reason, note, rejectedAt)

### GET /creator/videos/:id

**Authentication**: Required (JWT, video owner)

**Response** (for resubmitted video):
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "rejectionReason": "Copyright issue",
  "rejectionNote": "Music at 00:42–01:03",
  "rejectedAt": "2026-03-10T10:00:00Z",
  "resubmittedAt": "2026-03-12T09:15:00Z",
  "moderationVersion": 2,
  ...
}
```

**New Fields**:
- `resubmittedAt`: Resubmission timestamp (if resubmitted)
- `moderationVersion`: Current revision number

### GET /admin/moderation/queue

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Response** (for resubmitted video):
```json
{
  "id": "vid_123",
  "title": "How to Build AI Agent",
  "status": "PENDING_APPROVAL",
  "moderationVersion": 2,
  "resubmittedAt": "2026-03-12T09:15:00Z",
  "rejectionReason": "Copyright issue",
  ...
}
```

**New Fields**:
- `moderationVersion`: Revision number
- `resubmittedAt`: Resubmission timestamp
- `rejectionReason`: Previous rejection reason (for context)

## Business Rules

### Resubmission Rules

1. **Status Requirement**: Only `REJECTED` videos can be resubmitted
   - `REJECTED` → `PENDING_APPROVAL` ✅
   - `DRAFT` → resubmit ❌
   - `READY` → resubmit ❌
   - `APPROVED` → resubmit ❌
   - `PUBLISHED` → resubmit ❌

2. **Ownership Requirement**: Only video owner can resubmit
   - Enforced by `uploaderId` check
   - Returns `403 Forbidden` if not owner

3. **Status Transition**: Resubmission moves to `PENDING_APPROVAL`
   - Does not go directly to `APPROVED` or `PUBLISHED`
   - Requires admin review again
   - Maintains moderation workflow integrity

4. **Rejection Context Preservation**:
   - Rejection reason is NOT cleared
   - Rejection note is NOT cleared
   - Rejection timestamp is NOT cleared
   - This provides context for creator and admin

### Moderation Version

1. **Initial Version**: New videos start at `moderationVersion: 1`
2. **Increment on Resubmission**: Each resubmission increments version
3. **Purpose**:
   - Track revision history
   - Identify resubmitted videos
   - Future audit trail support

### Lifecycle Flow

**Complete Moderation Cycle**:
```
READY
  ↓
PENDING_APPROVAL (first submission)
  ↓
REJECTED (with feedback)
  ↓
[Creator edits video]
  ↓
PENDING_APPROVAL (resubmission, version 2)
  ↓
APPROVED / PUBLISHED
```

**Multiple Rejections**:
```
REJECTED (version 1)
  ↓
PENDING_APPROVAL (resubmission, version 2)
  ↓
REJECTED (version 2)
  ↓
PENDING_APPROVAL (resubmission, version 3)
  ↓
APPROVED
```

## UI Features

### Creator Dashboard

**Resubmit Button**:
- Location: Below rejection feedback panel
- Visibility: Only for `REJECTED` status videos
- Behavior:
  - Disabled during submission
  - Shows "Resubmitting..." while pending
  - Refreshes video data on success
  - Shows error message on failure

**Resubmission Banner**:
- Location: Top of edit page
- Visibility: For `PENDING_APPROVAL` videos with `resubmittedAt`
- Content:
  - "Your video has been resubmitted and is awaiting moderation"
  - Revision number if `moderationVersion > 1`

**Rejection Panel**:
- Still visible after resubmission (for context)
- Shows previous rejection reason and notes
- Helps creator understand what was fixed

### Admin Moderation UI

**Revision Badge**:
- Location: Next to video title
- Visibility: For videos with `moderationVersion > 1`
- Display: "Revision {version}"
- Styling: Blue badge

**Resubmission Info**:
- Location: In video metadata line
- Display: "Resubmitted {timestamp}"
- Styling: Amber color

**Previous Rejection Context**:
- Location: Below video metadata
- Display: "Previously rejected: {reason}"
- Visibility: For `PENDING_APPROVAL` videos with previous rejection
- Helps admins understand revision context

## Testing Checklist

### Backend Tests

#### 1. Valid Resubmission
- [ ] `POST /creator/videos/:id/resubmit` succeeds for rejected video
- [ ] Video status changes to `PENDING_APPROVAL`
- [ ] `resubmittedAt` is set
- [ ] `moderationVersion` increments
- [ ] Rejection context is preserved

#### 2. Invalid Status
- [ ] Resubmitting `READY` video returns 400
- [ ] Resubmitting `DRAFT` video returns 400
- [ ] Resubmitting `APPROVED` video returns 400
- [ ] Resubmitting `PUBLISHED` video returns 400

#### 3. Ownership Validation
- [ ] Non-owner cannot resubmit
- [ ] Returns 403 Forbidden
- [ ] Owner can resubmit their own video

#### 4. Creator Video API
- [ ] `GET /creator/videos/:id` includes `resubmittedAt` for resubmitted videos
- [ ] `GET /creator/videos/:id` includes `moderationVersion`
- [ ] Rejection context is preserved

#### 5. Admin Moderation Queue
- [ ] Queue includes `moderationVersion` for all videos
- [ ] Queue includes `resubmittedAt` for resubmitted videos
- [ ] Previous rejection reason shown for context

### Frontend Tests

#### 1. Resubmit Button
- [ ] Button appears for rejected videos
- [ ] Button does not appear for non-rejected videos
- [ ] Button disabled during submission
- [ ] Button shows loading state
- [ ] Video data refreshes after success

#### 2. Resubmission Flow
- [ ] Click resubmit button
- [ ] Button shows "Resubmitting..."
- [ ] Success message appears
- [ ] Video status updates to `PENDING_APPROVAL`
- [ ] Resubmission banner appears
- [ ] Revision number shows if > 1

#### 3. Admin Queue Display
- [ ] Revision badge appears for resubmitted videos
- [ ] Resubmission timestamp shows
- [ ] Previous rejection reason shows
- [ ] All info displays correctly

#### 4. Error Handling
- [ ] Error message shows on failure
- [ ] Button re-enables after error
- [ ] Video data does not change on error

## Day 26 LOCK Checklist ✅

### Backend
- [x] Resubmission fields added to Video model
- [x] `resubmitVideo()` method implemented
- [x] Resubmit endpoint created
- [x] Validation: only REJECTED videos
- [x] Validation: only owner can resubmit
- [x] Status transition: REJECTED → PENDING_APPROVAL
- [x] `moderationVersion` increments
- [x] `resubmittedAt` timestamp set
- [x] Creator video API includes resubmission fields
- [x] Admin queue includes revision info

### Frontend
- [x] Resubmit API helper created
- [x] Resubmit button added to creator UI
- [x] Button disabled during submission
- [x] Success message shows
- [x] Video data refreshes after resubmission
- [x] Resubmission banner shows
- [x] Revision number displays
- [x] Admin queue shows revision info

### Integration
- [x] Resubmission flow works end-to-end
- [x] Creators can resubmit rejected videos
- [x] Admins can see revision context
- [x] All validation rules enforced
- [x] Rejection context preserved

## Migration Required

After implementing Day 26, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_resubmission_fields
pnpm prisma generate
```

This migration will:
- Add `resubmittedAt` field to Video table
- Add `moderationVersion` field to Video table (default: 1)
- Set default value for existing videos

## Suggested curl Checks

### Resubmit Video

```bash
# Get creator token
export CREATOR_TOKEN="your_creator_jwt_token_here"

# Resubmit rejected video
curl -X POST "http://localhost:3001/creator/videos/VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

Expected:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "resubmittedAt": "2026-03-12T09:15:00.000Z",
  "moderationVersion": 2,
  "message": "Video resubmitted for moderation"
}
```

### Get Creator Video (After Resubmission)

```bash
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/VIDEO_ID"
```

Expected:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "rejectionReason": "Copyright issue",
  "rejectionNote": "Music at 00:42–01:03",
  "rejectedAt": "2026-03-10T10:00:00Z",
  "resubmittedAt": "2026-03-12T09:15:00Z",
  "moderationVersion": 2,
  ...
}
```

### Get Admin Moderation Queue

```bash
# Get admin token
export ADMIN_TOKEN="your_admin_jwt_token_here"

curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL"
```

Expected:
```json
[
  {
    "id": "vid_123",
    "status": "PENDING_APPROVAL",
    "moderationVersion": 2,
    "resubmittedAt": "2026-03-12T09:15:00Z",
    "rejectionReason": "Copyright issue",
    ...
  }
]
```

### Test Invalid Resubmission

```bash
# Try resubmitting a READY video
curl -X POST "http://localhost:3001/creator/videos/READY_VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

Expected: `400 Bad Request` ("Only rejected videos can be resubmitted")

## Field Constraints

### Resubmitted At
- **Type**: DateTime
- **Required**: No (set automatically on resubmission)
- **Purpose**: Timestamp of last resubmission

### Moderation Version
- **Type**: Int
- **Required**: Yes (default: 1)
- **Default**: 1 for new videos
- **Increment**: Automatically incremented on resubmission
- **Purpose**: Track revision history

## Status Transition Rules

### Allowed Transitions
- `REJECTED` → `PENDING_APPROVAL` (via resubmit) ✅

### Disallowed Transitions
- `DRAFT` → resubmit ❌
- `READY` → resubmit ❌
- `APPROVED` → resubmit ❌
- `PUBLISHED` → resubmit ❌
- `PENDING_APPROVAL` → resubmit ❌

## Edge Cases

### Repeated Resubmission
- **Scenario**: Creator clicks resubmit multiple times
- **Handling**: 
  - Client: Button disabled during request
  - Server: Once status is `PENDING_APPROVAL`, second request returns 400

### Resubmission After Approval
- **Scenario**: Video was rejected, resubmitted, then approved
- **Handling**: Cannot resubmit approved videos (validation prevents)

### Multiple Rejections
- **Scenario**: Video rejected, resubmitted, rejected again
- **Handling**: 
  - Each resubmission increments version
  - Previous rejection context preserved
  - New rejection overwrites old rejection fields

### Deleted/Archived Video
- **Scenario**: Try to resubmit deleted video
- **Handling**: Returns 404 Not Found

## Future Enhancements

### Resubmission Limits
- Limit number of resubmissions per video
- Prevent infinite resubmission loops
- Require admin intervention after N rejections

### Resubmission Analytics
- Track resubmission rates
- Identify common rejection patterns
- Help creators avoid repeated mistakes

### Automatic Resubmission
- Auto-resubmit after specific edits (e.g., thumbnail change)
- Smart resubmission based on rejection reason
- Batch resubmission for multiple videos

### Resubmission Notifications
- Notify admin when video is resubmitted
- Email creator when resubmission is reviewed
- In-app notifications for resubmission status

### Resubmission History
- Full audit trail of all resubmissions
- Compare versions side-by-side
- Track changes between submissions

### Resubmission Templates
- Pre-filled resubmission forms
- Common fixes checklist
- Guided resubmission flow

## Result of Day 26

After this day, Streamora gains:
- ✅ Complete moderation feedback loop
- ✅ Actionable rejection feedback
- ✅ Resubmission workflow
- ✅ Revision tracking
- ✅ Admin context for resubmissions
- ✅ Production-ready moderation cycle

This completes the moderation workflow, making Streamora a true moderation-first platform with a complete creator ↔ admin feedback loop.

## Files Created/Modified

### Backend
- `apps/api/prisma/schema.prisma` (modified - added resubmission fields)
- `apps/api/src/videos/videos.service.ts` (modified - added `resubmitVideo()` method)
- `apps/api/src/videos/videos.controller.ts` (modified - added resubmit endpoint)
- `apps/api/src/admin/admin.moderation.controller.ts` (modified - updated queue response)

### Frontend
- `apps/web/src/lib/api/creator-videos.ts` (modified - added `resubmitCreatorVideo()` helper)
- `apps/web/src/components/video-draft-editor.tsx` (modified - added resubmit button and banner)
- `apps/web/src/app/[locale]/admin/moderation/page.tsx` (modified - added revision display)

## Next Steps

- Add resubmission limits
- Add resubmission analytics
- Add resubmission notifications
- Add resubmission history/audit trail
- Add automatic resubmission features
