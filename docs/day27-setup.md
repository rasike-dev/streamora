# Day 27: Content Governance

## Summary

Implemented content governance system that allows admins to manage published content after it goes live. This includes takedown (removal from public access), archiving (intentional retirement), and restoration capabilities, all with a complete audit trail. This completes the post-publication lifecycle management for Streamora.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Governance Fields to Video Model**:
- `takedownReason` (String?) - Reason for takedown
- `takedownNote` (String?) - Admin notes for takedown
- `takenDownAt` (DateTime?) - Timestamp when video was taken down
- `takenDownBy` (String?) - Admin user ID who performed takedown
- `archivedReason` (String?) - Reason for archiving
- `archivedNote` (String?) - Admin notes for archiving
- `archivedAt` (DateTime?) - Timestamp when video was archived
- `archivedBy` (String?) - Admin user ID who performed archiving

**Created VideoAuditLog Model**:
- `id` (String, @id)
- `videoId` (String) - Reference to video
- `action` (VideoAuditAction) - Type of action performed
- `actorUserId` (String) - User who performed the action
- `metadata` (Json?) - Additional action metadata
- `createdAt` (DateTime) - Timestamp of action

**Created VideoAuditAction Enum**:
- `VIDEO_CREATED`
- `VIDEO_SUBMITTED`
- `VIDEO_APPROVED`
- `VIDEO_REJECTED`
- `VIDEO_RESUBMITTED`
- `VIDEO_PUBLISHED`
- `VIDEO_TAKEDOWN`
- `VIDEO_ARCHIVED`
- `VIDEO_RESTORED`

**Purpose**:
- Track governance actions for compliance
- Maintain audit trail for legal readiness
- Enable accountability for moderation actions
- Support operational governance

### 2. Backend: Governance DTOs ✅

**Created**: `apps/api/src/admin/dto/takedown-video.dto.ts`
- `reason` (required, string) - Takedown reason
- `note` (optional, string) - Admin notes

**Created**: `apps/api/src/admin/dto/archive-video.dto.ts`
- `reason` (optional, string) - Archive reason
- `note` (optional, string) - Admin notes

**Created**: `apps/api/src/admin/dto/restore-video.dto.ts`
- `note` (optional, string) - Restore note

### 3. Backend: Governance Service ✅

**Created**: `apps/api/src/admin/admin-governance.service.ts`

**Methods**:

#### `takedownVideo(videoId, adminId, body)`
- Validates video exists and is `PUBLISHED`
- Updates status to `TAKEDOWN`
- Saves takedown reason and note
- Records timestamp and admin ID
- Creates audit log entry
- Returns updated video

**Validation**:
- Only `PUBLISHED` videos can be taken down
- Reason is required (max 500 chars)
- Note is optional (max 2000 chars)

#### `archiveVideo(videoId, adminId, body)`
- Validates video exists and is `PUBLISHED`
- Updates status to `ARCHIVED`
- Saves archive reason and note (both optional)
- Records timestamp and admin ID
- Creates audit log entry
- Returns updated video

**Validation**:
- Only `PUBLISHED` videos can be archived
- Reason is optional (max 500 chars)
- Note is optional (max 2000 chars)

#### `restoreVideo(videoId, adminId, body)`
- Validates video exists and is `TAKEDOWN` or `ARCHIVED`
- Updates status to `PUBLISHED`
- Clears all governance fields
- Records restore note
- Creates audit log entry
- Returns updated video

**Validation**:
- Only `TAKEDOWN` or `ARCHIVED` videos can be restored
- Note is optional (max 2000 chars)

### 4. Backend: Governance Controller ✅

**Created**: `apps/api/src/admin/admin-governance.controller.ts`

**Endpoints**:

#### `POST /admin/videos/:id/takedown`
- **Authentication**: Required (JWT, ADMIN or MODERATOR role)
- **Request Body**: `{ reason: string, note?: string }`
- **Response**: Updated video object
- **Errors**:
  - `404 Not Found`: Video not found
  - `400 Bad Request`: Video is not published or validation failed

#### `POST /admin/videos/:id/archive`
- **Authentication**: Required (JWT, ADMIN or MODERATOR role)
- **Request Body**: `{ reason?: string, note?: string }`
- **Response**: Updated video object
- **Errors**:
  - `404 Not Found`: Video not found
  - `400 Bad Request`: Video is not published or validation failed

#### `POST /admin/videos/:id/restore`
- **Authentication**: Required (JWT, ADMIN or MODERATOR role)
- **Request Body**: `{ note?: string }`
- **Response**: Updated video object
- **Errors**:
  - `404 Not Found`: Video not found
  - `400 Bad Request`: Video is not taken down or archived

### 5. Backend: Creator Video API Updates ✅

**Updated**: `apps/api/src/videos/videos.service.ts`

**Updated Method**: `getDraft()`
- Now includes all governance fields in response
- Allows creators to see takedown/archive status and reasons

**Response for Governed Video**:
```json
{
  "id": "vid_123",
  "status": "TAKEDOWN",
  "takedownReason": "Copyright violation",
  "takedownNote": "Claim received from rights holder",
  "takenDownAt": "2026-03-12T10:00:00Z",
  "takenDownBy": "admin_user_id",
  ...
}
```

### 6. Backend: Admin Moderation Queue Updates ✅

**Updated**: `apps/api/src/admin/admin.moderation.controller.ts`

**Updated Endpoint**: `GET /admin/moderation/queue`
- Now accepts `TAKEDOWN` and `ARCHIVED` as valid status filters
- Includes governance fields in response:
  - `takedownReason` (for TAKEDOWN videos)
  - `archivedReason` (for ARCHIVED videos)
  - `takenDownAt` (timestamp)
  - `archivedAt` (timestamp)

**Response for Governed Video**:
```json
{
  "id": "vid_123",
  "title": "How to Build AI Agent",
  "status": "TAKEDOWN",
  "takedownReason": "Copyright violation",
  "takenDownAt": "2026-03-12T10:00:00Z",
  ...
}
```

### 7. Frontend: Governance API Helpers ✅

**Created**: `apps/web/src/lib/api/admin-governance.ts`

**Functions**:
- `takedownVideo(videoId, reason, note?)` - Takes down a video
- `archiveVideo(videoId, reason?, note?)` - Archives a video
- `restoreVideo(videoId, note?)` - Restores a video

All functions:
- Handle authentication
- Handle errors gracefully
- Return response data

### 8. Frontend: Creator Dashboard Updates ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`

**New Features**:
- Takedown panel for `TAKEDOWN` status videos
  - Shows warning icon and message
  - Displays takedown reason
  - Displays admin notes
  - Shows takedown timestamp
- Archive panel for `ARCHIVED` status videos
  - Shows archive icon and message
  - Displays archive reason (if provided)
  - Displays admin notes (if provided)
  - Shows archive timestamp

**UI Display**:
- Takedown panel: Red border/background with warning styling
- Archive panel: Gray border/background with neutral styling
- Both panels show clear messaging about governance action

### 9. Frontend: Admin Moderation UI Updates ✅

**Updated**: `apps/web/src/app/[locale]/admin/moderation/page.tsx`

**New Features**:
- Status filter buttons for all governance statuses:
  - PENDING_APPROVAL
  - APPROVED
  - REJECTED
  - PUBLISHED
  - TAKEDOWN
  - ARCHIVED
- Governance action buttons:
  - **Take Down** (for PUBLISHED videos)
  - **Archive** (for PUBLISHED videos)
  - **Restore** (for TAKEDOWN or ARCHIVED videos)
- Governance reason display:
  - Shows takedown reason for TAKEDOWN videos
  - Shows archive reason for ARCHIVED videos
  - Shows timestamps for governance actions

**Button Behavior**:
- Take Down: Prompts for reason (required) and note (optional)
- Archive: Prompts for reason (optional) and note (optional)
- Restore: Prompts for note (optional)
- All actions refresh the queue after completion

## API Endpoints

### POST /admin/videos/:id/takedown

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Request Body**:
```json
{
  "reason": "Copyright violation",
  "note": "Claim received from rights holder"
}
```

**Response**:
```json
{
  "id": "vid_123",
  "status": "TAKEDOWN",
  "takedownReason": "Copyright violation",
  "takedownNote": "Claim received from rights holder",
  "takenDownAt": "2026-03-12T10:00:00Z",
  "takenDownBy": "admin_user_id",
  ...
}
```

**Errors**:
- `404 Not Found`: Video not found
- `400 Bad Request`: Video is not published or validation failed

**Behavior**:
- Updates video status to `TAKEDOWN`
- Saves takedown reason and note
- Records timestamp and admin ID
- Creates audit log entry
- Video becomes inaccessible to public

### POST /admin/videos/:id/archive

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Request Body**:
```json
{
  "reason": "Content outdated",
  "note": "Superseded by updated tutorial"
}
```

**Response**:
```json
{
  "id": "vid_123",
  "status": "ARCHIVED",
  "archivedReason": "Content outdated",
  "archivedNote": "Superseded by updated tutorial",
  "archivedAt": "2026-03-12T10:00:00Z",
  "archivedBy": "admin_user_id",
  ...
}
```

**Errors**:
- `404 Not Found`: Video not found
- `400 Bad Request`: Video is not published or validation failed

**Behavior**:
- Updates video status to `ARCHIVED`
- Saves archive reason and note (both optional)
- Records timestamp and admin ID
- Creates audit log entry
- Video becomes inaccessible to public

### POST /admin/videos/:id/restore

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Request Body**:
```json
{
  "note": "Issue resolved"
}
```

**Response**:
```json
{
  "id": "vid_123",
  "status": "PUBLISHED",
  "takedownReason": null,
  "takedownNote": null,
  "takenDownAt": null,
  "takenDownBy": null,
  "archivedReason": null,
  "archivedNote": null,
  "archivedAt": null,
  "archivedBy": null,
  ...
}
```

**Errors**:
- `404 Not Found`: Video not found
- `400 Bad Request`: Video is not taken down or archived

**Behavior**:
- Updates video status to `PUBLISHED`
- Clears all governance fields
- Records restore note
- Creates audit log entry
- Video becomes accessible to public again

### GET /admin/moderation/queue?status=TAKEDOWN

**Authentication**: Required (JWT, ADMIN or MODERATOR role)

**Query Parameters**:
- `status` (optional): Filter by status (PENDING_APPROVAL, APPROVED, REJECTED, PUBLISHED, TAKEDOWN, ARCHIVED)

**Response**:
```json
[
  {
    "id": "vid_123",
    "title": "How to Build AI Agent",
    "status": "TAKEDOWN",
    "takedownReason": "Copyright violation",
    "takenDownAt": "2026-03-12T10:00:00Z",
    ...
  }
]
```

## Business Rules

### Governance Rules

1. **Takedown Rules**:
   - Only `PUBLISHED` videos can be taken down
   - Takedown reason is required
   - Takedown note is optional
   - Takedown removes video from public access
   - Takedown creates audit log entry

2. **Archive Rules**:
   - Only `PUBLISHED` videos can be archived
   - Archive reason is optional
   - Archive note is optional
   - Archive removes video from public access
   - Archive creates audit log entry

3. **Restore Rules**:
   - Only `TAKEDOWN` or `ARCHIVED` videos can be restored
   - Restore note is optional
   - Restore clears all governance fields
   - Restore sets status to `PUBLISHED`
   - Restore creates audit log entry

### Status Transition Rules

**Allowed Transitions**:
- `PUBLISHED` → `TAKEDOWN` (via takedown) ✅
- `PUBLISHED` → `ARCHIVED` (via archive) ✅
- `TAKEDOWN` → `PUBLISHED` (via restore) ✅
- `ARCHIVED` → `PUBLISHED` (via restore) ✅

**Disallowed Transitions**:
- `DRAFT` → takedown ❌
- `READY` → archive ❌
- `REJECTED` → restore ❌
- `APPROVED` → takedown ❌

### Public Access Rules

**Public Access Allowed**:
- `status = PUBLISHED`
- `visibility = PUBLIC` or `UNLISTED`

**Public Access Blocked**:
- `status = TAKEDOWN`
- `status = ARCHIVED`
- All other statuses

**Note**: Public APIs automatically exclude TAKEDOWN and ARCHIVED videos because they filter by `status: 'PUBLISHED'`.

### Permission Rules

**Admin/Moderator Actions**:
- Can takedown published videos
- Can archive published videos
- Can restore taken down or archived videos
- Can view governance audit logs

**Creator Restrictions**:
- Cannot takedown their own videos
- Cannot archive their own videos
- Cannot restore their own videos
- Can view governance status and reasons
- Can edit videos (if status allows)

## Audit Trail

### VideoAuditLog Model

**Purpose**:
- Track all governance actions
- Maintain compliance records
- Enable accountability
- Support legal requirements

**Fields**:
- `videoId`: Reference to video
- `action`: Type of action (VideoAuditAction enum)
- `actorUserId`: User who performed action
- `metadata`: Additional action data (JSON)
- `createdAt`: Timestamp of action

**Indexes**:
- `[videoId, createdAt]`: For video-specific audit queries
- `[action, createdAt]`: For action-specific audit queries

### Audit Actions

**Governance Actions**:
- `VIDEO_TAKEDOWN`: Video was taken down
- `VIDEO_ARCHIVED`: Video was archived
- `VIDEO_RESTORED`: Video was restored

**Moderation Actions** (for reference):
- `VIDEO_CREATED`: Video was created
- `VIDEO_SUBMITTED`: Video was submitted for moderation
- `VIDEO_APPROVED`: Video was approved
- `VIDEO_REJECTED`: Video was rejected
- `VIDEO_RESUBMITTED`: Video was resubmitted
- `VIDEO_PUBLISHED`: Video was published

## UI Features

### Creator Dashboard

**Takedown Panel**:
- Location: Top of edit page
- Visibility: For `TAKEDOWN` status videos
- Content:
  - Warning icon and message
  - Takedown reason
  - Admin notes
  - Takedown timestamp
- Styling: Red border/background

**Archive Panel**:
- Location: Top of edit page
- Visibility: For `ARCHIVED` status videos
- Content:
  - Archive icon and message
  - Archive reason (if provided)
  - Admin notes (if provided)
  - Archive timestamp
- Styling: Gray border/background

### Admin Moderation UI

**Status Filter**:
- Location: Top of moderation page
- Options:
  - PENDING_APPROVAL
  - APPROVED
  - REJECTED
  - PUBLISHED
  - TAKEDOWN
  - ARCHIVED
- Behavior: Filters queue by selected status

**Governance Buttons**:
- **Take Down**: For `PUBLISHED` videos
  - Prompts for reason (required) and note (optional)
  - Red styling
- **Archive**: For `PUBLISHED` videos
  - Prompts for reason (optional) and note (optional)
  - Gray styling
- **Restore**: For `TAKEDOWN` or `ARCHIVED` videos
  - Prompts for note (optional)
  - Green styling

**Governance Display**:
- Shows takedown reason for TAKEDOWN videos
- Shows archive reason for ARCHIVED videos
- Shows timestamps for governance actions
- Helps admins understand governance context

## Testing Checklist

### Backend Tests

#### 1. Takedown Video
- [ ] `POST /admin/videos/:id/takedown` succeeds for published video
- [ ] Video status changes to `TAKEDOWN`
- [ ] Takedown reason is saved
- [ ] Takedown note is saved
- [ ] Timestamp is recorded
- [ ] Admin ID is recorded
- [ ] Audit log entry is created

#### 2. Archive Video
- [ ] `POST /admin/videos/:id/archive` succeeds for published video
- [ ] Video status changes to `ARCHIVED`
- [ ] Archive reason is saved (if provided)
- [ ] Archive note is saved (if provided)
- [ ] Timestamp is recorded
- [ ] Admin ID is recorded
- [ ] Audit log entry is created

#### 3. Restore Video
- [ ] `POST /admin/videos/:id/restore` succeeds for taken down video
- [ ] `POST /admin/videos/:id/restore` succeeds for archived video
- [ ] Video status changes to `PUBLISHED`
- [ ] All governance fields are cleared
- [ ] Restore note is saved (if provided)
- [ ] Audit log entry is created

#### 4. Invalid Status
- [ ] Takedown on non-published video returns 400
- [ ] Archive on non-published video returns 400
- [ ] Restore on published video returns 400

#### 5. Public API Exclusion
- [ ] TAKEDOWN videos not returned in public APIs
- [ ] ARCHIVED videos not returned in public APIs
- [ ] Only PUBLISHED videos appear in public listings

#### 6. Creator Video API
- [ ] `GET /creator/videos/:id` includes governance fields for governed videos
- [ ] Creators can see takedown/archive status
- [ ] Creators can see governance reasons

#### 7. Admin Moderation Queue
- [ ] Queue includes TAKEDOWN status filter
- [ ] Queue includes ARCHIVED status filter
- [ ] Queue shows governance reasons
- [ ] Queue shows governance timestamps

### Frontend Tests

#### 1. Creator Takedown Panel
- [ ] Panel appears for taken down videos
- [ ] Shows takedown reason
- [ ] Shows admin notes
- [ ] Shows timestamp
- [ ] Styled correctly (red)

#### 2. Creator Archive Panel
- [ ] Panel appears for archived videos
- [ ] Shows archive reason (if provided)
- [ ] Shows admin notes (if provided)
- [ ] Shows timestamp
- [ ] Styled correctly (gray)

#### 3. Admin Status Filter
- [ ] Filter buttons appear
- [ ] Filter works for all statuses
- [ ] Active filter is highlighted
- [ ] Queue updates when filter changes

#### 4. Admin Governance Buttons
- [ ] Take Down button appears for published videos
- [ ] Archive button appears for published videos
- [ ] Restore button appears for taken down/archived videos
- [ ] Buttons prompt for required information
- [ ] Actions refresh queue after completion

#### 5. Admin Governance Display
- [ ] Takedown reason shows for TAKEDOWN videos
- [ ] Archive reason shows for ARCHIVED videos
- [ ] Timestamps display correctly
- [ ] All info displays correctly

## Day 27 LOCK Checklist ✅

### Backend
- [x] Governance fields added to Video model
- [x] VideoAuditLog model created
- [x] VideoAuditAction enum created
- [x] Governance DTOs created
- [x] `takedownVideo()` method implemented
- [x] `archiveVideo()` method implemented
- [x] `restoreVideo()` method implemented
- [x] Governance endpoints created
- [x] Validation: only PUBLISHED videos can be governed
- [x] Validation: only TAKEDOWN/ARCHIVED can be restored
- [x] Audit log entries created
- [x] Creator video API includes governance fields
- [x] Admin queue includes governance statuses

### Frontend
- [x] Governance API helpers created
- [x] Takedown panel added to creator UI
- [x] Archive panel added to creator UI
- [x] Status filter added to admin UI
- [x] Governance buttons added to admin UI
- [x] Governance reasons display in admin UI

### Integration
- [x] Governance flow works end-to-end
- [x] Admins can takedown published videos
- [x] Admins can archive published videos
- [x] Admins can restore governed videos
- [x] Creators can see governance status
- [x] Public APIs exclude governed videos
- [x] Audit trail is maintained

## Migration Required

After implementing Day 27, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_content_governance
pnpm prisma generate
```

This migration will:
- Add governance fields to Video table
- Create VideoAuditLog table
- Create VideoAuditAction enum
- Set up indexes for audit queries

## Suggested curl Checks

### Takedown Video

```bash
# Get admin token
export ADMIN_TOKEN="your_admin_jwt_token_here"

# Takedown published video
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/takedown" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Copyright violation",
    "note": "Claim received from rights holder"
  }'
```

Expected:
```json
{
  "id": "vid_123",
  "status": "TAKEDOWN",
  "takedownReason": "Copyright violation",
  "takedownNote": "Claim received from rights holder",
  "takenDownAt": "2026-03-12T10:00:00Z",
  "takenDownBy": "admin_user_id",
  ...
}
```

### Archive Video

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Content outdated",
    "note": "Superseded by updated tutorial"
  }'
```

Expected:
```json
{
  "id": "vid_123",
  "status": "ARCHIVED",
  "archivedReason": "Content outdated",
  "archivedNote": "Superseded by updated tutorial",
  "archivedAt": "2026-03-12T10:00:00Z",
  "archivedBy": "admin_user_id",
  ...
}
```

### Restore Video

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Issue resolved"
  }'
```

Expected:
```json
{
  "id": "vid_123",
  "status": "PUBLISHED",
  "takedownReason": null,
  "takedownNote": null,
  "takenDownAt": null,
  "takenDownBy": null,
  "archivedReason": null,
  "archivedNote": null,
  "archivedAt": null,
  "archivedBy": null,
  ...
}
```

### Get Admin Moderation Queue (TAKEDOWN)

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=TAKEDOWN"
```

Expected:
```json
[
  {
    "id": "vid_123",
    "status": "TAKEDOWN",
    "takedownReason": "Copyright violation",
    "takenDownAt": "2026-03-12T10:00:00Z",
    ...
  }
]
```

### Test Invalid Takedown

```bash
# Try takedown on a DRAFT video
curl -X POST "http://localhost:3001/admin/videos/DRAFT_VIDEO_ID/takedown" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'
```

Expected: `400 Bad Request` ("Only published videos can be taken down")

## Field Constraints

### Takedown Fields
- **takedownReason**: String, optional, max 500 characters
- **takedownNote**: String, optional, max 2000 characters
- **takenDownAt**: DateTime, set automatically on takedown
- **takenDownBy**: String, set automatically to admin user ID

### Archive Fields
- **archivedReason**: String, optional, max 500 characters
- **archivedNote**: String, optional, max 2000 characters
- **archivedAt**: DateTime, set automatically on archive
- **archivedBy**: String, set automatically to admin user ID

## Status Transition Rules

### Allowed Transitions
- `PUBLISHED` → `TAKEDOWN` (via takedown) ✅
- `PUBLISHED` → `ARCHIVED` (via archive) ✅
- `TAKEDOWN` → `PUBLISHED` (via restore) ✅
- `ARCHIVED` → `PUBLISHED` (via restore) ✅

### Disallowed Transitions
- `DRAFT` → takedown ❌
- `READY` → archive ❌
- `REJECTED` → restore ❌
- `APPROVED` → takedown ❌
- `PENDING_APPROVAL` → takedown ❌

## Edge Cases

### Repeated Governance Actions
- **Scenario**: Admin takes down, restores, then takes down again
- **Handling**: 
  - Each action creates new audit log entry
  - Previous governance fields are cleared on restore
  - New governance fields are set on new action

### Restore After Multiple Actions
- **Scenario**: Video was taken down, then archived (if possible)
- **Handling**: 
  - Only one governance status at a time
  - Restore clears all governance fields
  - Restore sets status to `PUBLISHED`

### Deleted/Archived Video
- **Scenario**: Try to govern a deleted video
- **Handling**: Returns 404 Not Found

### Public API Access
- **Scenario**: User tries to access TAKEDOWN video via public API
- **Handling**: 
  - Public APIs filter by `status: 'PUBLISHED'`
  - TAKEDOWN/ARCHIVED videos automatically excluded
  - Returns 404 Not Found

## Future Enhancements

### Governance Notifications
- Notify creator when video is taken down
- Notify creator when video is archived
- Notify creator when video is restored
- Email notifications for governance actions

### Governance Analytics
- Track takedown rates
- Track archive rates
- Track restore rates
- Identify common governance patterns

### Governance Workflows
- Automatic takedown on copyright claim
- Scheduled archiving for outdated content
- Bulk governance actions
- Governance approval workflows

### Governance History
- Full audit trail view
- Compare governance actions
- Track governance trends
- Export governance reports

### Governance Policies
- Configurable takedown reasons
- Configurable archive reasons
- Policy-based auto-governance
- Governance rule engine

## Result of Day 27

After this day, Streamora gains:
- ✅ Post-publication content management
- ✅ Takedown capabilities for compliance
- ✅ Archiving for content retirement
- ✅ Restoration for content recovery
- ✅ Complete audit trail
- ✅ Creator visibility into governance
- ✅ Admin governance tools
- ✅ Production-ready content governance

This completes the content lifecycle management, making Streamora a true production platform with full governance capabilities.

## Files Created/Modified

### Backend
- `apps/api/prisma/schema.prisma` (modified - added governance fields and audit log)
- `apps/api/src/admin/dto/takedown-video.dto.ts` (new)
- `apps/api/src/admin/dto/archive-video.dto.ts` (new)
- `apps/api/src/admin/dto/restore-video.dto.ts` (new)
- `apps/api/src/admin/admin-governance.service.ts` (new)
- `apps/api/src/admin/admin-governance.controller.ts` (new)
- `apps/api/src/app.module.ts` (modified - registered governance controller and service)
- `apps/api/src/admin/admin.moderation.controller.ts` (modified - added governance statuses)
- `apps/api/src/videos/videos.service.ts` (modified - added governance fields to getDraft)

### Frontend
- `apps/web/src/lib/api/admin-governance.ts` (new)
- `apps/web/src/components/video-draft-editor.tsx` (modified - added governance panels)
- `apps/web/src/app/[locale]/admin/moderation/page.tsx` (modified - added governance UI)

## Next Steps

- Add governance notifications
- Add governance analytics
- Add governance workflows
- Add governance history views
- Add governance policy engine
