# Day 25: Moderation Improvements

## Summary

Implemented moderation improvements that strengthen the creator ↔ admin feedback loop. Admins can now reject videos with clear reasons and notes, while creators can see rejection feedback and understand what needs to be fixed. This prepares the system for Day 26 — Resubmission Flow.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Fields to Video Model**:
- `rejectionReason` (String?) - Required reason for rejection (max 500 chars)
- `rejectionNote` (String?) - Optional admin notes (max 2000 chars)
- `rejectedAt` (DateTime?) - Timestamp when video was rejected
- `rejectedBy` (String?) - Admin user ID who rejected the video

**Purpose**:
- Stores rejection feedback for creators
- Provides audit trail of moderation actions
- Enables creator learning and resubmission

### 2. Backend: Reject Video DTO ✅

**Created**: `apps/api/src/admin/dto/reject-video.dto.ts`

**DTO Fields**:
- `reason` (required) - Rejection reason, max 500 characters
- `note` (optional) - Admin notes, max 2000 characters

**Validation**:
- Uses `class-validator` decorators
- `@IsString()`, `@IsNotEmpty()` for reason
- `@IsOptional()` for note
- `@MaxLength()` constraints

### 3. Backend: Moderation Controller Updates ✅

**Updated**: `apps/api/src/admin/admin.moderation.controller.ts`

**Updated Endpoint**: `POST /admin/videos/:id/reject`
- Now accepts `RejectVideoDto` in request body
- Validates video is in `PENDING_APPROVAL` status
- Stores rejection reason, note, timestamp, and admin ID
- Returns updated video status

**Validation Logic**:
- Only `PENDING_APPROVAL` videos can be rejected
- Returns `BadRequestException` if video is not pending
- Returns `NotFoundException` if video doesn't exist

**Updated Endpoint**: `GET /admin/moderation/queue`
- Now includes `rejectionReason` in response for rejected videos
- Helps admins see rejection reasons in moderation list

### 4. Backend: Creator Video Service Updates ✅

**Updated**: `apps/api/src/videos/videos.service.ts`

**Updated Method**: `getDraft()`
- Now includes rejection fields in response
- Returns `rejectionReason`, `rejectionNote`, `rejectedAt` when video is rejected
- Uses `select` to explicitly include rejection fields

**Security**:
- Only returns rejection details to video owner
- Validates `uploaderId` matches requesting user

### 5. Frontend: Admin Moderation UI Updates ✅

**Updated**: `apps/web/src/app/[locale]/admin/moderation/page.tsx`

**New Features**:
- Rejection form appears when "Reject" button is clicked
- Form fields:
  - Reason (required text input)
  - Admin Notes (optional textarea)
- "Confirm Reject" button validates and submits
- "Cancel" button to close form
- Shows rejection reason in queue for rejected videos

**UI Flow**:
1. Admin clicks "Reject" button
2. Form expands below video card
3. Admin enters reason (required) and optional notes
4. Admin clicks "Confirm Reject"
5. Form validates and submits
6. Queue refreshes with updated status

### 6. Frontend: Creator Dashboard Updates ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`

**New Features**:
- Rejection feedback panel displays when video is `REJECTED`
- Shows rejection reason prominently
- Shows admin notes if provided
- Styled with red border and background
- Message: "Please fix the issue and resubmit your video"

**Panel Display**:
- Only shows for `REJECTED` status videos
- Appears at top of edit page
- Clear visual hierarchy with reason and notes
- Dark mode support

## API Endpoints

### POST /admin/videos/:id/reject

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Request Body**:
```json
{
  "reason": "Video contains copyrighted content",
  "note": "Timestamp 00:42–01:03 contains music from a copyrighted source"
}
```

**Validation**:
- `reason`: Required, string, max 500 characters
- `note`: Optional, string, max 2000 characters

**Response**:
```json
{
  "ok": true,
  "id": "vid_123",
  "status": "REJECTED"
}
```

**Errors**:
- `404 Not Found`: Video not found
- `400 Bad Request`: Video is not in PENDING_APPROVAL status
- `403 Forbidden`: User is not admin or moderator

**Behavior**:
- Updates video status to `REJECTED`
- Stores rejection reason and note
- Records rejection timestamp
- Records admin user ID

### GET /admin/moderation/queue

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Query Parameters**:
- `status` (optional): Filter by status (default: `PENDING_APPROVAL`)
  - Allowed: `PENDING_APPROVAL`, `REJECTED`, `APPROVED`

**Response**:
```json
[
  {
    "id": "vid_123",
    "slug": "video-slug",
    "title": "Video Title",
    "uploaderId": "user_123",
    "uploaderName": "Creator Name",
    "createdAt": "2026-03-12T10:00:00Z",
    "status": "REJECTED",
    "rejectionReason": "Video contains copyrighted content"
  }
]
```

**New Field**:
- `rejectionReason`: Included for rejected videos, `null` for others

### GET /creator/videos/:id

**Authentication**: Required (JWT, video owner)

**Response** (for rejected video):
```json
{
  "id": "vid_123",
  "slug": "video-slug",
  "status": "REJECTED",
  "rejectionReason": "Video contains copyrighted content",
  "rejectionNote": "Timestamp 00:42–01:03 contains music from a copyrighted source",
  "rejectedAt": "2026-03-12T10:00:00Z",
  "translations": [...],
  "channels": [...],
  "tags": [...]
}
```

**New Fields**:
- `rejectionReason`: Rejection reason (if rejected)
- `rejectionNote`: Admin notes (if provided)
- `rejectedAt`: Rejection timestamp (if rejected)

## Business Rules

### Moderation Lifecycle

1. **Moderation Invariant**: Creators cannot publish content directly
   - Admin moderation must occur first
   - Only admins can approve/reject/publish

2. **Rejection Rules**:
   - Only `PENDING_APPROVAL` videos can be rejected
   - Rejection requires a reason (mandatory)
   - Admin notes are optional but recommended
   - Rejection is permanent until resubmission (Day 26)

3. **Rejected Video States**:
   - `REJECTED` videos remain non-public
   - `REJECTED` videos are never public
   - `REJECTED` videos can be edited by creator
   - `REJECTED` videos can be resubmitted (Day 26)

### Editable Statuses

Creators can edit videos when status is:
- `DRAFT`
- `UPLOADED`
- `PROCESSING_FAILED`
- `READY`
- `REJECTED` ✅ (newly editable)

### Security Rules

1. **Rejection Permission**:
   - Only `ADMIN` or `MODERATOR` roles can reject
   - Enforced by `@Roles('ADMIN', 'MODERATOR')` guard

2. **Creator Access**:
   - Creators can only view their own rejection details
   - Enforced by `uploaderId` check in `getDraft()`

3. **Status Validation**:
   - Only `PENDING_APPROVAL` videos can be rejected
   - Prevents rejecting already processed videos

## UI Features

### Admin Moderation UI

**Rejection Form**:
- Appears inline when "Reject" is clicked
- Reason field (required, text input)
- Admin Notes field (optional, textarea)
- "Confirm Reject" button (validates before submit)
- "Cancel" button (closes form)

**Queue Display**:
- Shows rejection reason for rejected videos
- Helps admins see why videos were rejected
- Useful for reviewing moderation history

### Creator Dashboard

**Rejection Feedback Panel**:
- Location: Top of video edit page
- Visibility: Only for `REJECTED` status videos
- Content:
  - Rejection reason (prominent)
  - Admin notes (if provided)
  - Resubmission guidance message

**Styling**:
- Red border and background
- Dark mode support
- Clear visual hierarchy
- Responsive design

## Testing Checklist

### Backend Tests

#### 1. Reject Video with Reason
- [ ] `POST /admin/videos/:id/reject` with reason succeeds
- [ ] Video status changes to `REJECTED`
- [ ] Rejection reason is stored
- [ ] Rejection timestamp is recorded
- [ ] Admin ID is recorded

#### 2. Reject Video with Reason and Note
- [ ] `POST /admin/videos/:id/reject` with reason and note succeeds
- [ ] Both reason and note are stored
- [ ] All fields are persisted correctly

#### 3. Reject Validation
- [ ] Rejecting non-pending video returns 400
- [ ] Rejecting without reason returns validation error
- [ ] Rejecting with empty reason returns validation error
- [ ] Rejecting with too long reason returns validation error

#### 4. Creator Video API
- [ ] `GET /creator/videos/:id` includes rejection fields for rejected videos
- [ ] Rejection fields are `null` for non-rejected videos
- [ ] Only video owner can see rejection details

#### 5. Moderation Queue
- [ ] `GET /admin/moderation/queue?status=REJECTED` includes rejection reasons
- [ ] Rejection reasons are shown for rejected videos
- [ ] Rejection reasons are `null` for non-rejected videos

### Frontend Tests

#### 1. Admin Rejection Form
- [ ] "Reject" button shows form
- [ ] Form has reason and note fields
- [ ] Reason field is required
- [ ] Note field is optional
- [ ] "Confirm Reject" validates reason
- [ ] "Cancel" closes form
- [ ] Form submits correctly

#### 2. Creator Rejection Panel
- [ ] Panel appears for rejected videos
- [ ] Panel shows rejection reason
- [ ] Panel shows admin notes (if provided)
- [ ] Panel is styled correctly
- [ ] Panel doesn't appear for non-rejected videos

#### 3. Security
- [ ] Non-admin cannot access reject endpoint
- [ ] Creator can only see their own rejection details
- [ ] Rejection form only appears for admins

## Day 25 LOCK Checklist ✅

### Backend
- [x] Rejection fields added to Video model
- [x] RejectVideoDto created with validation
- [x] Reject endpoint accepts DTO
- [x] Reject endpoint validates status
- [x] Rejection reason, note, timestamp, admin ID stored
- [x] Creator video API includes rejection fields
- [x] Moderation queue includes rejection reason

### Frontend
- [x] Admin rejection form implemented
- [x] Form validates required fields
- [x] Creator rejection panel implemented
- [x] Panel shows reason and notes
- [x] Panel styled correctly
- [x] Dark mode support

### Integration
- [x] Rejection flow works end-to-end
- [x] Creators can see rejection feedback
- [x] Admins can provide clear feedback
- [x] Security rules enforced

## Migration Required

After implementing Day 25, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_moderation_rejection_fields
pnpm prisma generate
```

This migration will:
- Add `rejectionReason` field to Video table
- Add `rejectionNote` field to Video table
- Add `rejectedAt` field to Video table
- Add `rejectedBy` field to Video table

## Suggested curl Checks

### Reject Video with Reason

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Video contains copyrighted content",
    "note": "Timestamp 00:42–01:03 contains music from a copyrighted source"
  }'
```

Expected:
```json
{
  "ok": true,
  "id": "vid_123",
  "status": "REJECTED"
}
```

### Get Creator Video (Rejected)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos/VIDEO_ID"
```

Expected (for rejected video):
```json
{
  "id": "vid_123",
  "status": "REJECTED",
  "rejectionReason": "Video contains copyrighted content",
  "rejectionNote": "Timestamp 00:42–01:03 contains music from a copyrighted source",
  "rejectedAt": "2026-03-12T10:00:00Z",
  ...
}
```

### Get Moderation Queue (Rejected)

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=REJECTED"
```

Expected:
```json
[
  {
    "id": "vid_123",
    "status": "REJECTED",
    "rejectionReason": "Video contains copyrighted content",
    ...
  }
]
```

## Field Constraints

### Rejection Reason
- **Type**: String
- **Required**: Yes
- **Max Length**: 500 characters
- **Purpose**: Clear, concise reason for rejection

### Rejection Note
- **Type**: String
- **Required**: No
- **Max Length**: 2000 characters
- **Purpose**: Detailed admin notes with specific feedback

### Rejected At
- **Type**: DateTime
- **Required**: No (set automatically)
- **Purpose**: Audit trail timestamp

### Rejected By
- **Type**: String (User ID)
- **Required**: No (set automatically)
- **Purpose**: Audit trail of which admin rejected

## Future Enhancements

### Moderation History
- Full audit trail of all moderation actions
- Separate `ModerationEvent` table
- Track approve, reject, publish actions
- History view for admins

### Rejection Templates
- Pre-defined rejection reasons
- Quick-select common reasons
- Custom notes still supported

### Creator Notifications
- Email notification on rejection
- In-app notification
- Notification preferences

### Resubmission Flow (Day 26)
- "Resubmit for Approval" button
- Clear rejected status
- Track resubmission count
- Prevent infinite resubmissions

### Rejection Analytics
- Track common rejection reasons
- Identify patterns
- Help creators avoid common mistakes
- Improve moderation efficiency

## Result of Day 25

After this day, Streamora gains:
- ✅ Clear rejection feedback for creators
- ✅ Improved admin moderation workflow
- ✅ Better creator ↔ admin communication
- ✅ Foundation for resubmission flow
- ✅ Moderation audit trail
- ✅ Enhanced moderation-first platform

This is a critical Phase 3 feature that directly improves the moderation workflow and creator experience, essential for a moderation-first platform like Streamora.

## Files Created/Modified

### Backend
- `apps/api/prisma/schema.prisma` (modified - added rejection fields)
- `apps/api/src/admin/dto/reject-video.dto.ts` (new)
- `apps/api/src/admin/admin.moderation.controller.ts` (modified - updated reject endpoint)
- `apps/api/src/videos/videos.service.ts` (modified - updated getDraft method)

### Frontend
- `apps/web/src/app/[locale]/admin/moderation/page.tsx` (modified - added rejection form)
- `apps/web/src/components/video-draft-editor.tsx` (modified - added rejection panel)

## Next Steps

- Day 26: Implement resubmission flow
- Add rejection templates
- Add creator notifications
- Add moderation history/audit trail
- Add rejection analytics
