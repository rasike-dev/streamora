# Day 27: Content Governance - Execution Steps

## Prerequisites

- Day 26 (Resubmission Flow) completed
- Database accessible
- API and Web apps running
- Valid authentication tokens available
- At least one video in `PUBLISHED` status for testing
- Admin user account available for testing
- Creator user account available for testing

## Step 1: Database Migration

Run the Prisma migration to add governance fields and audit log:

```bash
cd apps/api
pnpm prisma migrate dev --name add_content_governance
pnpm prisma generate
cd ../..
```

**Expected Output**:
- Migration file created in `apps/api/prisma/migrations/`
- Governance fields added to Video table
- VideoAuditLog table created
- VideoAuditAction enum created
- Prisma client regenerated

**Verification**:
```bash
# Check migration was created
ls apps/api/prisma/migrations/ | grep add_content_governance

# Verify Prisma client generated
# Check that Video model includes governance fields
# Check that VideoAuditLog model exists
```

## Step 2: Verify Backend Files

Confirm all backend files are in place:

```bash
# Check governance service exists
grep "takedownVideo\|archiveVideo\|restoreVideo" apps/api/src/admin/admin-governance.service.ts

# Check governance controller exists
grep "takedown\|archive\|restore" apps/api/src/admin/admin-governance.controller.ts

# Verify DTOs exist
ls apps/api/src/admin/dto/takedown-video.dto.ts
ls apps/api/src/admin/dto/archive-video.dto.ts
ls apps/api/src/admin/dto/restore-video.dto.ts
```

## Step 3: Restart API Server

Restart the API server to load new code:

```bash
# Stop current API server (Ctrl+C if running)
# Then restart:
cd apps/api
pnpm dev
# Or if using root:
pnpm dev:api
```

**Expected**: API starts without errors, new routes registered

## Step 4: Test Backend Governance Endpoints

### 4.1 Get Authentication Token

```bash
# Login as admin and get token
# Store token in variable:
export ADMIN_TOKEN="your_admin_jwt_token_here"
```

### 4.2 Get Published Video ID

First, get a video in `PUBLISHED` status:

```bash
# Get published videos from moderation queue
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PUBLISHED"
```

Note the `id` of a published video.

### 4.3 Test Takedown

```bash
# Replace VIDEO_ID with actual published video ID
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/takedown" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Copyright violation",
    "note": "Claim received from rights holder"
  }'
```

**Expected Response**:
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

**Verification**:
- Response shows `status: "TAKEDOWN"`
- Response includes `takedownReason`
- Response includes `takenDownAt` timestamp
- Response includes `takenDownBy` admin ID
- No errors returned

### 4.4 Test Archive

First, restore the taken down video (or use a different published video):

```bash
# Restore the taken down video first
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Testing archive"}'

# Then archive it
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/archive" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Content outdated",
    "note": "Superseded by updated tutorial"
  }'
```

**Expected Response**:
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

**Verification**:
- Response shows `status: "ARCHIVED"`
- Response includes `archivedReason`
- Response includes `archivedAt` timestamp
- Response includes `archivedBy` admin ID

### 4.5 Test Restore

```bash
# Restore the archived video
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Issue resolved"
  }'
```

**Expected Response**:
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

**Verification**:
- Response shows `status: "PUBLISHED"`
- All governance fields are null
- Video is accessible again

### 4.6 Test Invalid Status

Try takedown on a non-published video:

```bash
# Use a DRAFT or READY video ID
curl -X POST "http://localhost:3001/admin/videos/DRAFT_VIDEO_ID/takedown" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'
```

**Expected**: `400 Bad Request` ("Only published videos can be taken down")

### 4.7 Test Invalid Restore

Try restoring a published video:

```bash
# Use a PUBLISHED video ID
curl -X POST "http://localhost:3001/admin/videos/PUBLISHED_VIDEO_ID/restore" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"note": "Test"}'
```

**Expected**: `400 Bad Request` ("Only taken down or archived videos can be restored")

### 4.8 Test Validation

Try takedown without reason:

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/takedown" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected**: `400 Bad Request` ("Takedown reason is required")

### 4.9 Test Creator Video API

Get video details after takedown:

```bash
# Get creator token
export CREATOR_TOKEN="your_creator_jwt_token_here"

# Get video details
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/TAKEN_DOWN_VIDEO_ID"
```

**Expected Response**:
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

**Verification**:
- Response includes governance fields
- Creator can see takedown status and reason

### 4.10 Test Admin Moderation Queue

```bash
# Get TAKEDOWN videos
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=TAKEDOWN"

# Get ARCHIVED videos
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=ARCHIVED"
```

**Expected Response**:
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

**Verification**:
- Response includes governance statuses
- Response includes governance reasons
- Response includes governance timestamps

### 4.11 Test Public API Exclusion

```bash
# Try to access taken down video via public API
curl "http://localhost:3001/public/videos/TAKEN_DOWN_VIDEO_SLUG?locale=en"
```

**Expected**: `404 Not Found` (TAKEDOWN videos are excluded from public APIs)

## Step 5: Verify Frontend Files

Confirm all frontend files are in place:

```bash
# Check API helper
grep "takedownVideo\|archiveVideo\|restoreVideo" apps/web/src/lib/api/admin-governance.ts

# Check creator UI
grep "TAKEDOWN\|ARCHIVED" apps/web/src/components/video-draft-editor.tsx

# Check admin UI
grep "takedown\|archive\|restore" apps/web/src/app/[locale]/admin/moderation/page.tsx
```

## Step 6: Restart Web Server

Restart the Next.js web server:

```bash
# Stop current web server (Ctrl+C if running)
# Then restart:
cd apps/web
pnpm dev
# Or if using root:
pnpm dev:web
```

**Expected**: Web server starts without errors

## Step 7: Test Creator Governance UI

### 7.1 Navigate to Taken Down Video

1. Login as creator user
2. Navigate to: `/{locale}/dashboard/videos/{taken_down_video_id}/edit`
3. Verify takedown panel is visible

**Expected**: Takedown panel shows with reason, notes, and timestamp

### 7.2 Test Takedown Panel

1. Scroll to takedown panel
2. Verify all information displays

**Expected**:
- Warning icon and message visible
- Takedown reason displayed
- Admin notes displayed (if provided)
- Timestamp displayed
- Panel styled with red border/background

### 7.3 Test Archive Panel

1. Navigate to an archived video edit page
2. Verify archive panel is visible

**Expected**:
- Archive icon and message visible
- Archive reason displayed (if provided)
- Admin notes displayed (if provided)
- Timestamp displayed
- Panel styled with gray border/background

### 7.4 Test Panel Visibility

1. Navigate to a non-governed video edit page
2. **Expected**: Governance panels do NOT appear

## Step 8: Test Admin Governance UI

### 8.1 Navigate to Moderation Queue

1. Login as admin user
2. Navigate to: `/{locale}/admin/moderation`
3. View moderation queue

**Expected**: Video cards show with action buttons

### 8.2 Test Status Filter

1. Click on different status filter buttons
2. **Expected**:
   - Filter buttons appear at top
   - Active filter is highlighted
   - Queue updates when filter changes
   - All statuses filter correctly

### 8.3 Test Takedown Button

1. Filter by `PUBLISHED` status
2. Find a published video
3. Click "Take Down" button
4. Enter reason when prompted
5. Enter note when prompted (optional)

**Expected**:
- Button appears for published videos
- Prompt asks for reason (required)
- Prompt asks for note (optional)
- Video status updates to TAKEDOWN
- Queue refreshes
- Takedown reason shows in queue

### 8.4 Test Archive Button

1. Filter by `PUBLISHED` status
2. Find a published video
3. Click "Archive" button
4. Enter reason when prompted (optional)
5. Enter note when prompted (optional)

**Expected**:
- Button appears for published videos
- Prompt asks for reason (optional)
- Prompt asks for note (optional)
- Video status updates to ARCHIVED
- Queue refreshes
- Archive reason shows in queue (if provided)

### 8.5 Test Restore Button

1. Filter by `TAKEDOWN` or `ARCHIVED` status
2. Find a governed video
3. Click "Restore" button
4. Enter note when prompted (optional)

**Expected**:
- Button appears for taken down/archived videos
- Prompt asks for note (optional)
- Video status updates to PUBLISHED
- Queue refreshes
- Governance fields cleared

### 8.6 Test Governance Display

Check governance reasons in queue:

**Expected**:
- Takedown reason shows for TAKEDOWN videos
- Archive reason shows for ARCHIVED videos
- Timestamps display correctly
- All info displays correctly

### 8.7 Test Button Visibility

1. Check published videos
2. **Expected**: Take Down and Archive buttons visible

3. Check taken down videos
4. **Expected**: Restore button visible

5. Check archived videos
6. **Expected**: Restore button visible

## Step 9: Test Complete Workflow

### 9.1 Full Governance Cycle

1. **Publish Video**: Video is published
   - Status: `PUBLISHED`

2. **Takedown Video**: Admin takes down video
   - Status: `PUBLISHED` → `TAKEDOWN`
   - Takedown reason stored
   - Audit log entry created

3. **Restore Video**: Admin restores video
   - Status: `TAKEDOWN` → `PUBLISHED`
   - Governance fields cleared
   - Audit log entry created

4. **Archive Video**: Admin archives video
   - Status: `PUBLISHED` → `ARCHIVED`
   - Archive reason stored
   - Audit log entry created

5. **Restore Again**: Admin restores video
   - Status: `ARCHIVED` → `PUBLISHED`
   - Governance fields cleared
   - Audit log entry created

**Expected**: Complete cycle works smoothly

### 9.2 Public API Exclusion

1. Take down a published video
2. Try to access via public API

**Expected**:
- Video not returned in public listings
- Video not accessible via public slug
- Returns 404 Not Found

3. Restore the video
4. Try to access via public API

**Expected**:
- Video returned in public listings
- Video accessible via public slug
- Returns video data

## Step 10: Test Edge Cases

### 10.1 Rapid Actions

1. Take down a video
2. Immediately try to archive it

**Expected**: Returns 400 (video is now TAKEDOWN, not PUBLISHED)

### 10.2 Missing Reason

1. Try takedown without reason

**Expected**: Returns 400 ("Takedown reason is required")

### 10.3 Long Text

1. Try takedown with very long reason (>500 chars)

**Expected**: Returns 400 ("Takedown reason must be 500 characters or less")

### 10.4 Restore Published

1. Try to restore a published video

**Expected**: Returns 400 ("Only taken down or archived videos can be restored")

### 10.5 Non-Admin Access

1. Try governance action as creator

**Expected**: Returns 403 Forbidden

## Step 11: Final Verification Checklist

### Backend ✅
- [ ] Migration applied successfully
- [ ] Takedown endpoint works for published videos
- [ ] Archive endpoint works for published videos
- [ ] Restore endpoint works for taken down/archived videos
- [ ] Only PUBLISHED videos can be governed
- [ ] Only TAKEDOWN/ARCHIVED can be restored
- [ ] Governance fields are saved correctly
- [ ] Audit log entries are created
- [ ] Creator video API includes governance fields
- [ ] Admin queue includes governance statuses
- [ ] Public APIs exclude governed videos

### Frontend ✅
- [ ] Takedown panel appears for taken down videos
- [ ] Archive panel appears for archived videos
- [ ] Status filter works for all statuses
- [ ] Take Down button appears for published videos
- [ ] Archive button appears for published videos
- [ ] Restore button appears for governed videos
- [ ] Governance reasons display correctly
- [ ] Governance timestamps display correctly
- [ ] All buttons work correctly

### Integration ✅
- [ ] Complete governance flow works
- [ ] Admins can takedown published videos
- [ ] Admins can archive published videos
- [ ] Admins can restore governed videos
- [ ] Creators can see governance status
- [ ] Public APIs exclude governed videos
- [ ] Audit trail is maintained

## Troubleshooting

### Issue: Migration fails

**Error**: `Error: P1012: Environment variable not found: DATABASE_URL`

**Solution**:
```bash
# Ensure DATABASE_URL is set in apps/api/.env
cd apps/api
echo "DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora" >> .env
```

### Issue: Takedown endpoint returns 400

**Check**:
- Video is in `PUBLISHED` status
- Reason is provided
- Reason is not too long

**Debug**:
```bash
# Check video status
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PUBLISHED"

# Verify status is PUBLISHED
```

### Issue: Governance panels don't appear

**Check**:
- Video status is `TAKEDOWN` or `ARCHIVED`
- Component is imported correctly
- No JavaScript errors in console

**Debug**:
```bash
# Check browser console
# Verify video status in API response
# Check component conditional rendering
```

### Issue: Status filter doesn't work

**Check**:
- API response includes governance statuses
- Frontend receives correct data
- Filter state updates correctly

**Debug**:
```bash
# Test API directly
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=TAKEDOWN"

# Check response includes TAKEDOWN videos
# Verify frontend receives data
```

### Issue: Public API still returns governed videos

**Check**:
- Public API filters by `status: 'PUBLISHED'`
- Governed videos have status `TAKEDOWN` or `ARCHIVED`

**Debug**:
```bash
# Check video status in database
# Verify public API where clause
# Test public API directly
```

## Day 27 LOCK Criteria

Day 27 is LOCKED when:

✅ Admin can takedown published video
✅ Admin can archive published video
✅ Admin can restore governed video
✅ Governance actions create audit log
✅ Public APIs hide TAKEDOWN/ARCHIVED
✅ Creator dashboard shows governance messages
✅ Admin UI shows governance buttons
✅ Status filter works for all statuses
✅ Governance reasons display correctly
✅ Complete governance workflow works

## Next Steps After Day 27

- Add governance notifications
- Add governance analytics
- Add governance workflows
- Add governance history views
- Add governance policy engine
