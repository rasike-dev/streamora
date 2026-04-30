# Day 26: Resubmission Flow - Execution Steps

## Prerequisites

- Day 25 (Moderation Improvements) completed
- Database accessible
- API and Web apps running
- Valid authentication tokens available
- At least one video in `REJECTED` status for testing
- Creator user account available for testing
- Admin user account available for testing

## Step 1: Database Migration

Run the Prisma migration to add resubmission fields:

```bash
cd apps/api
pnpm prisma migrate dev --name add_resubmission_fields
pnpm prisma generate
cd ../..
```

**Expected Output**:
- Migration file created in `apps/api/prisma/migrations/`
- `resubmittedAt` and `moderationVersion` fields added to Video table
- Prisma client regenerated

**Verification**:
```bash
# Check migration was created
ls apps/api/prisma/migrations/ | grep add_resubmission_fields

# Verify Prisma client generated
# Check that Video model includes resubmission fields
```

## Step 2: Verify Backend Files

Confirm all backend files are in place:

```bash
# Check service method exists
grep "resubmitVideo" apps/api/src/videos/videos.service.ts

# Check controller endpoint exists
grep "resubmit" apps/api/src/videos/videos.controller.ts

# Verify getDraft includes new fields
grep "resubmittedAt\|moderationVersion" apps/api/src/videos/videos.service.ts
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

**Expected**: API starts without errors, new route registered

## Step 4: Test Backend Resubmit Endpoint

### 4.1 Get Authentication Token

```bash
# Login as creator and get token
# Store token in variable:
export CREATOR_TOKEN="your_creator_jwt_token_here"
```

### 4.2 Get Rejected Video ID

First, get a video in `REJECTED` status:

```bash
# Get creator's videos
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos?status=REJECTED"
```

Note the `id` of a rejected video.

### 4.3 Test Valid Resubmission

```bash
# Replace VIDEO_ID with actual rejected video ID
curl -X POST "http://localhost:3001/creator/videos/VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "id": "vid_123",
  "status": "PENDING_APPROVAL",
  "resubmittedAt": "2026-03-12T09:15:00.000Z",
  "moderationVersion": 2,
  "message": "Video resubmitted for moderation"
}
```

**Verification**:
- Response shows `status: "PENDING_APPROVAL"`
- Response includes `resubmittedAt` timestamp
- Response includes `moderationVersion` (incremented)
- No errors returned

### 4.4 Test Invalid Status

Try resubmitting a video that's not rejected:

```bash
# Use a READY video ID
curl -X POST "http://localhost:3001/creator/videos/READY_VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

**Expected**: `400 Bad Request` ("Only rejected videos can be resubmitted")

### 4.5 Test Wrong Owner

Try resubmitting another creator's video:

```bash
# Use another creator's video ID
curl -X POST "http://localhost:3001/creator/videos/OTHER_CREATOR_VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

**Expected**: `403 Forbidden` or `404 Not Found`

### 4.6 Test Double Resubmission

Try resubmitting a video that's already been resubmitted:

```bash
# Use a video that's now PENDING_APPROVAL after resubmission
curl -X POST "http://localhost:3001/creator/videos/PENDING_VIDEO_ID/resubmit" \
  -H "Authorization: Bearer $CREATOR_TOKEN"
```

**Expected**: `400 Bad Request` ("Only rejected videos can be resubmitted")

### 4.7 Test Creator Video API

Get video details after resubmission:

```bash
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/RESUBMITTED_VIDEO_ID"
```

**Expected Response**:
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

**Verification**:
- Response includes `resubmittedAt`
- Response includes `moderationVersion`
- Rejection context is preserved
- Status is `PENDING_APPROVAL`

### 4.8 Test Admin Moderation Queue

```bash
# Get admin token
export ADMIN_TOKEN="your_admin_jwt_token_here"

# Get pending videos (including resubmitted)
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL"
```

**Expected Response**:
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

**Verification**:
- Response includes `moderationVersion`
- Response includes `resubmittedAt` for resubmitted videos
- Response includes `rejectionReason` for context

## Step 5: Verify Frontend Files

Confirm all frontend files are in place:

```bash
# Check API helper
grep "resubmitCreatorVideo" apps/web/src/lib/api/creator-videos.ts

# Check creator UI
grep "resubmit\|Resubmit" apps/web/src/components/video-draft-editor.tsx

# Check admin UI
grep "moderationVersion\|Revision" apps/web/src/app/[locale]/admin/moderation/page.tsx
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

## Step 7: Test Creator Resubmit UI

### 7.1 Navigate to Rejected Video

1. Login as creator user
2. Navigate to: `/{locale}/dashboard/videos/{rejected_video_id}/edit`
3. Verify rejection panel is visible

**Expected**: Rejection panel shows with reason and notes

### 7.2 Test Resubmit Button

1. Scroll to rejection panel
2. Find "Resubmit for Approval" button

**Expected**:
- Button appears below rejection panel
- Button is enabled (not disabled)
- Button text: "Resubmit for Approval"

### 7.3 Test Resubmission

1. Click "Resubmit for Approval" button
2. Button should show "Resubmitting..." state
3. Wait for response

**Expected**:
- Button shows "Resubmitting..." while pending
- Button is disabled during request
- Success message appears: "✅ Video resubmitted for moderation"
- Video status updates to `PENDING_APPROVAL`
- Resubmit button disappears
- Resubmission banner appears

### 7.4 Test Resubmission Banner

After successful resubmission:

**Expected**:
- Banner appears at top of page
- Text: "Your video has been resubmitted and is awaiting moderation"
- Shows revision number if `moderationVersion > 1`
- Banner styled with amber border/background

### 7.5 Test Button Visibility

1. Navigate to a non-rejected video edit page
2. **Expected**: Resubmit button does NOT appear

### 7.6 Test Error Handling

1. Try resubmitting a video that's not rejected (if possible)
2. **Expected**: Error message shows, button re-enables

## Step 8: Test Admin Moderation UI

### 8.1 Navigate to Moderation Queue

1. Login as admin user
2. Navigate to: `/{locale}/admin/moderation`
3. View pending videos

**Expected**: Video cards show with action buttons

### 8.2 Test Revision Badge

Look for resubmitted videos in the queue:

**Expected**:
- "Revision {version}" badge appears next to video title
- Badge shows for videos with `moderationVersion > 1`
- Badge styled with blue background

### 8.3 Test Resubmission Info

Check video metadata line:

**Expected**:
- "Resubmitted {timestamp}" appears in metadata
- Timestamp is formatted correctly
- Styled with amber color

### 8.4 Test Previous Rejection Context

Check for videos with previous rejection:

**Expected**:
- "Previously rejected: {reason}" appears below metadata
- Only shows for `PENDING_APPROVAL` videos with previous rejection
- Helps admins understand revision context

### 8.5 Test Filter by Status

1. Filter queue by `REJECTED` status
2. Check rejected videos

**Expected**:
- Rejected videos show rejection reason
- No revision badge (not resubmitted yet)

## Step 9: Test Complete Workflow

### 9.1 Full Moderation Cycle

1. **Submit Video**: Creator submits video for moderation
   - Status: `READY` → `PENDING_APPROVAL`

2. **Reject Video**: Admin rejects with reason
   - Status: `PENDING_APPROVAL` → `REJECTED`
   - Rejection reason stored

3. **Edit Video**: Creator edits video
   - Video remains editable
   - Rejection feedback visible

4. **Resubmit Video**: Creator resubmits
   - Status: `REJECTED` → `PENDING_APPROVAL`
   - `moderationVersion` increments
   - `resubmittedAt` set

5. **Review Again**: Admin reviews resubmission
   - Sees revision number
   - Sees previous rejection reason
   - Can approve or reject again

**Expected**: Complete cycle works smoothly

### 9.2 Multiple Rejections

1. Resubmit rejected video
2. Admin rejects again
3. Creator resubmits again

**Expected**:
- `moderationVersion` increments each time
- Each resubmission tracked
- Previous rejection context preserved

## Step 10: Test Edge Cases

### 10.1 Rapid Clicks

1. Click resubmit button multiple times quickly
2. **Expected**: Only one request sent, button disabled

### 10.2 Network Error

1. Disconnect network
2. Click resubmit button
3. **Expected**: Error message shows, button re-enables

### 10.3 Already Pending

1. Resubmit a video
2. Try to resubmit again immediately
3. **Expected**: Returns 400 (video is now PENDING_APPROVAL, not REJECTED)

### 10.4 Version Increment

1. Resubmit video (version 1 → 2)
2. Get rejected again
3. Resubmit again (version 2 → 3)

**Expected**: Version increments correctly each time

## Step 11: Final Verification Checklist

### Backend ✅
- [ ] Migration applied successfully
- [ ] Resubmit endpoint works for rejected videos
- [ ] Only REJECTED videos can be resubmitted
- [ ] Only owner can resubmit
- [ ] Status changes to PENDING_APPROVAL
- [ ] `moderationVersion` increments
- [ ] `resubmittedAt` timestamp set
- [ ] Rejection context preserved
- [ ] Creator video API includes resubmission fields
- [ ] Admin queue includes revision info

### Frontend ✅
- [ ] Resubmit button appears for rejected videos
- [ ] Button disabled during submission
- [ ] Success message shows
- [ ] Video data refreshes after resubmission
- [ ] Resubmission banner appears
- [ ] Revision number displays
- [ ] Admin queue shows revision badge
- [ ] Admin queue shows resubmission timestamp
- [ ] Previous rejection reason shows in admin queue

### Integration ✅
- [ ] Complete resubmission flow works
- [ ] Creators can resubmit rejected videos
- [ ] Admins can see revision context
- [ ] All validation rules enforced
- [ ] All edge cases handled

## Troubleshooting

### Issue: Migration fails

**Error**: `Error: P1012: Environment variable not found: DATABASE_URL`

**Solution**:
```bash
# Ensure DATABASE_URL is set in apps/api/.env
cd apps/api
echo "DATABASE_URL=postgresql://streamora:streamora@localhost:5432/streamora" >> .env
```

### Issue: Resubmit endpoint returns 400

**Check**:
- Video is in `REJECTED` status
- User is video owner
- Video exists in database

**Debug**:
```bash
# Check video status
curl -H "Authorization: Bearer $CREATOR_TOKEN" \
  "http://localhost:3001/creator/videos/VIDEO_ID"

# Verify status is REJECTED
```

### Issue: Resubmit button doesn't appear

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

### Issue: Version doesn't increment

**Check**:
- Migration applied correctly
- Prisma client regenerated
- Database field exists

**Debug**:
```bash
# Check database directly
# Verify moderationVersion field exists
# Check Prisma schema
```

### Issue: Admin queue doesn't show revision

**Check**:
- API response includes `moderationVersion`
- Frontend receives correct data
- UI component renders correctly

**Debug**:
```bash
# Test API directly
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:3001/admin/moderation/queue?status=PENDING_APPROVAL"

# Check response includes moderationVersion
# Verify frontend receives data
```

## Day 26 LOCK Criteria

Day 26 is LOCKED when:

✅ Creator can resubmit rejected videos
✅ Only REJECTED videos can be resubmitted
✅ Ownership checks are enforced
✅ Status changes to PENDING_APPROVAL
✅ `resubmittedAt` and `moderationVersion` persist
✅ Creator UI updates correctly
✅ Admin queue shows resubmitted/revision context
✅ Rejection context is preserved
✅ Complete moderation cycle works

## Next Steps After Day 26

- Add resubmission limits
- Add resubmission analytics
- Add resubmission notifications
- Add resubmission history/audit trail
- Add automatic resubmission features
