# Day 25: Moderation Improvements - Execution Steps

## Prerequisites

- Day 20 (Analytics) completed
- Day 24 (Embed Player) completed (optional)
- Database accessible
- API and Web apps running
- Admin user account available for testing
- Creator user account available for testing
- At least one video in `PENDING_APPROVAL` status for testing

## Step 1: Database Migration

Run the Prisma migration to add rejection fields:

```bash
cd apps/api
pnpm prisma migrate dev --name add_moderation_rejection_fields
pnpm prisma generate
cd ../..
```

**Expected Output**:
- Migration file created in `apps/api/prisma/migrations/`
- Rejection fields added to Video table
- Prisma client regenerated

**Verification**:
```bash
# Check migration was created
ls apps/api/prisma/migrations/ | grep add_moderation_rejection_fields

# Verify Prisma client generated
# Check that Video model includes rejection fields
```

## Step 2: Verify Backend Files

Confirm all backend files are in place:

```bash
# Check DTO file
ls apps/api/src/admin/dto/reject-video.dto.ts

# Verify controller includes DTO import
grep "RejectVideoDto" apps/api/src/admin/admin.moderation.controller.ts

# Verify service includes rejection fields
grep "rejectionReason" apps/api/src/videos/videos.service.ts
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

**Expected**: API starts without errors, new DTO validation active

## Step 4: Test Backend Reject Endpoint

### 4.1 Get Authentication Token

```bash
# Login as admin and get token
# Store token in variable:
export TOKEN="your_admin_jwt_token_here"
```

### 4.2 Get Pending Video ID

First, get a video in `PENDING_APPROVAL` status:

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL"
```

Note the `id` of a pending video.

### 4.3 Test Reject with Reason Only

```bash
# Replace VIDEO_ID with actual video ID
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Video contains copyrighted content"
  }'
```

**Expected Response**:
```json
{
  "ok": true,
  "id": "vid_123",
  "status": "REJECTED"
}
```

**Verification**:
- Response shows `status: "REJECTED"`
- No errors returned

### 4.4 Test Reject with Reason and Note

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Video contains copyrighted content",
    "note": "Timestamp 00:42–01:03 contains music from a copyrighted source"
  }'
```

**Expected**: Same success response

### 4.5 Test Reject Validation

#### Test Missing Reason

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected**: `400 Bad Request` (validation error)

#### Test Empty Reason

```bash
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": ""}'
```

**Expected**: `400 Bad Request` (validation error)

#### Test Non-Pending Video

Try rejecting a video that's not in `PENDING_APPROVAL`:

```bash
# Use a video ID that's not pending
curl -X POST "http://localhost:3001/admin/videos/NON_PENDING_VIDEO_ID/reject" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'
```

**Expected**: `400 Bad Request` ("Only pending videos can be rejected")

### 4.6 Test Creator Video API

```bash
# Get creator token
export CREATOR_TOKEN="your_creator_jwt_token_here"

# Get rejected video details
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/REJECTED_VIDEO_ID"
```

**Expected Response**:
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

**Verification**:
- Response includes `rejectionReason`
- Response includes `rejectionNote` (if provided)
- Response includes `rejectedAt`
- All rejection fields present

### 4.7 Test Moderation Queue

```bash
# Get rejected videos
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=REJECTED"
```

**Expected Response**:
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

**Verification**:
- Response includes `rejectionReason` for rejected videos
- Rejection reasons are shown correctly

## Step 5: Verify Frontend Files

Confirm all frontend files are in place:

```bash
# Check admin moderation page
grep "rejectReason\|rejectNote" apps/web/src/app/[locale]/admin/moderation/page.tsx

# Check creator video editor
grep "rejectionReason\|rejectionNote" apps/web/src/components/video-draft-editor.tsx
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

## Step 7: Test Admin Rejection UI

### 7.1 Navigate to Moderation Page

1. Login as admin user
2. Navigate to: `/{locale}/admin/moderation`
3. Find a video in `PENDING_APPROVAL` status

**Expected**: Video cards show with "Reject" button

### 7.2 Test Rejection Form

1. Click "Reject" button on a pending video
2. Form should appear below video card

**Expected**:
- Form shows with "Reason" field (required)
- Form shows with "Admin Notes" field (optional)
- "Confirm Reject" and "Cancel" buttons appear

### 7.3 Test Form Validation

1. Try clicking "Confirm Reject" without entering reason
2. **Expected**: Validation error or alert

### 7.4 Test Rejection Submission

1. Enter rejection reason: "Video contains copyrighted content"
2. Enter admin notes: "Timestamp 00:42–01:03 contains music"
3. Click "Confirm Reject"

**Expected**:
- Form submits successfully
- Video status changes to REJECTED
- Queue refreshes
- Rejection reason shows in queue

### 7.5 Test Cancel Button

1. Click "Reject" button
2. Enter some text
3. Click "Cancel"

**Expected**:
- Form closes
- Text is cleared
- Video status unchanged

### 7.6 Test Rejected Video Display

1. Filter queue by `REJECTED` status
2. Check rejected videos

**Expected**:
- Rejection reason shows below video card
- Reason is clearly visible

## Step 8: Test Creator Rejection Panel

### 8.1 Navigate to Rejected Video

1. Login as creator user (owner of rejected video)
2. Navigate to: `/{locale}/dashboard/videos/{rejected_video_id}/edit`

**Expected**: Rejection panel appears at top of page

### 8.2 Verify Panel Content

**Expected**:
- Panel has red border and background
- Shows "❌ Rejected by Moderation" heading
- Shows rejection reason
- Shows admin notes (if provided)
- Shows "Please fix the issue and resubmit your video" message

### 8.3 Test Panel Visibility

1. Navigate to a non-rejected video edit page
2. **Expected**: Rejection panel does NOT appear

### 8.4 Test Video Editing

1. On rejected video edit page
2. Try editing title, description, etc.

**Expected**:
- Video is editable (REJECTED is in editable statuses)
- Changes can be saved
- Rejection panel remains visible

## Step 9: Test Security

### 9.1 Test Non-Admin Rejection

1. Login as creator (non-admin)
2. Try to access reject endpoint:

```bash
export CREATOR_TOKEN="creator_jwt_token"
curl -X POST "http://localhost:3001/admin/videos/VIDEO_ID/reject" \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Test"}'
```

**Expected**: `403 Forbidden`

### 9.2 Test Creator Access to Other Videos

1. Login as creator A
2. Try to access creator B's rejected video:

```bash
curl -H "Authorization: Bearer $CREATOR_A_TOKEN" \
  "http://localhost:3001/creator/videos/CREATOR_B_VIDEO_ID"
```

**Expected**: `404 Not Found` or `403 Forbidden`

### 9.3 Test Admin Access

1. Login as admin
2. Access any video's rejection details

**Expected**: Admin can see all rejection details

## Step 10: Test Edge Cases

### 10.1 Reject Video Without Note

Test that rejection works with only reason:

**Expected**: Rejection succeeds, note is `null`

### 10.2 Reject Video with Long Reason

Test with reason at max length (500 chars):

**Expected**: Rejection succeeds

### 10.3 Reject Video with Very Long Note

Test with note at max length (2000 chars):

**Expected**: Rejection succeeds

### 10.4 Reject Already Rejected Video

Try rejecting a video that's already rejected:

**Expected**: `400 Bad Request` ("Only pending videos can be rejected")

### 10.5 Reject Approved Video

Try rejecting an approved video:

**Expected**: `400 Bad Request` ("Only pending videos can be rejected")

## Step 11: Final Verification Checklist

### Backend ✅
- [ ] Migration applied successfully
- [ ] Reject endpoint accepts DTO
- [ ] Reject endpoint validates status
- [ ] Rejection reason, note, timestamp, admin ID stored
- [ ] Creator video API includes rejection fields
- [ ] Moderation queue includes rejection reason
- [ ] Validation works (required fields, max lengths)
- [ ] Security enforced (admin-only, owner-only)

### Frontend ✅
- [ ] Admin rejection form appears
- [ ] Form validates required fields
- [ ] Form submits correctly
- [ ] Creator rejection panel appears
- [ ] Panel shows reason and notes
- [ ] Panel styled correctly
- [ ] Dark mode works
- [ ] Panel only shows for rejected videos

### Integration ✅
- [ ] Rejection flow works end-to-end
- [ ] Creators can see rejection feedback
- [ ] Admins can provide clear feedback
- [ ] All edge cases handled
- [ ] Security rules enforced

## Troubleshooting

### Issue: Migration fails

**Error**: `Error: P1012: Environment variable not found: DATABASE_URL`

**Solution**:
```bash
# Ensure DATABASE_URL is set in apps/api/.env
cd apps/api
echo "DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora" >> .env
```

### Issue: Reject endpoint returns 400

**Check**:
- Video is in `PENDING_APPROVAL` status
- Request body includes `reason` field
- Reason is not empty
- Reason is not too long (max 500 chars)

**Debug**:
```bash
# Check video status
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL"

# Verify request body format
# Ensure Content-Type header is set
```

### Issue: Creator can't see rejection details

**Check**:
- Creator is video owner
- Video is actually rejected
- API response includes rejection fields

**Debug**:
```bash
# Test API directly
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/VIDEO_ID"

# Verify response includes rejectionReason
```

### Issue: Rejection panel doesn't appear

**Check**:
- Video status is `REJECTED`
- Component is imported correctly
- No JavaScript errors in console

**Debug**:
```bash
# Check browser console
# Verify video status in API response
# Check component conditional rendering
```

### Issue: Rejection form doesn't submit

**Check**:
- Reason field is filled
- No validation errors
- API endpoint is correct
- Token is valid

**Debug**:
```bash
# Check browser console for errors
# Verify network request in DevTools
# Check API logs
```

## Day 25 LOCK Criteria

Day 25 is LOCKED when:

✅ Admin can reject with reason
✅ Reason stored in database
✅ Creator sees rejection reason
✅ Creator sees admin notes
✅ Creator can edit rejected video
✅ Non-admin cannot reject
✅ Moderation UI shows rejection form
✅ Creator UI shows rejection panel
✅ Validation works correctly
✅ Security rules enforced

## Next Steps After Day 25

- Day 26: Implement resubmission flow
- Add rejection templates
- Add creator notifications
- Add moderation history/audit trail
- Add rejection analytics
