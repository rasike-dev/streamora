# Day 23: Short Share Links - Execution Steps

## Prerequisites

- Day 20 (Analytics) completed
- Database accessible
- API and Web apps running
- Valid authentication tokens available

## Step 1: Database Migration

Run the Prisma migration to add the `ShortLink` model:

```bash
cd apps/api
pnpm prisma migrate dev --name add_short_links
pnpm prisma generate
cd ../..
```

**Expected Output**:
- Migration file created in `apps/api/prisma/migrations/`
- `ShortLink` table created in database
- Prisma client regenerated

**Verification**:
```bash
# Check migration was created
ls apps/api/prisma/migrations/ | grep add_short_links

# Verify Prisma client generated
ls apps/api/node_modules/.prisma/client/ | grep ShortLink
```

## Step 2: Verify Backend Files

Confirm all backend files are in place:

```bash
# Check service file
ls apps/api/src/short-links/short-links.service.ts

# Check controller file
ls apps/api/src/short-links/short-links.controller.ts

# Verify app.module.ts includes new imports
grep -A 2 "ShortLinksController" apps/api/src/app.module.ts
grep -A 2 "ShortLinksService" apps/api/src/app.module.ts
```

## Step 3: Restart API Server

Restart the API server to load new modules:

```bash
# Stop current API server (Ctrl+C if running)
# Then restart:
cd apps/api
pnpm dev
# Or if using root:
pnpm dev:api
```

**Expected**: API starts without errors, new routes registered

## Step 4: Test Backend Endpoints

### 4.1 Get Authentication Token

```bash
# Login and get token (adjust based on your auth flow)
# Store token in variable:
export TOKEN="your_jwt_token_here"
```

### 4.2 Test Create Short Link

```bash
# Replace VIDEO_ID with actual video ID
curl -X POST "http://localhost:3001/videos/VIDEO_ID/share" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Expected Response**:
```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/s/abc123",
  "targetUrl": "/en/v/video-slug?src=share"
}
```

**Verification**:
- Response contains `code`, `shortUrl`, `targetUrl`
- Code is 6 characters, URL-safe
- Short URL points to `/s/{code}`

### 4.3 Test Idempotency

Run the same command again:

```bash
curl -X POST "http://localhost:3001/videos/VIDEO_ID/share" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected**: Same `code` returned (not a new one)

### 4.4 Test Resolve Short Link

```bash
# Use the code from previous response
curl "http://localhost:3001/short-links/abc123?locale=en"
```

**Expected Response**:
```json
{
  "code": "abc123",
  "target": {
    "videoId": "vid_123",
    "slug": "video-slug",
    "locale": "en",
    "redirectUrl": "/en/v/video-slug?src=share"
  }
}
```

**Verification**:
- `redirectUrl` includes `?src=share`
- Locale is correct
- Only works for PUBLISHED + PUBLIC/UNLISTED videos

### 4.5 Test Invalid Code

```bash
curl "http://localhost:3001/short-links/invalid123"
```

**Expected**: `404 Not Found`

## Step 5: Verify Frontend Files

Confirm all frontend files are in place:

```bash
# Check API helper
ls apps/web/src/lib/api/share-links.ts

# Check redirect route
ls apps/web/src/app/s/[code]/page.tsx

# Check button component
ls apps/web/src/components/CopyShareLinkButton.tsx

# Verify integration
grep "CopyShareLinkButton" apps/web/src/components/video-draft-editor.tsx
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

## Step 7: Test Frontend Redirect

### 7.1 Create a Short Link via API

First, create a short link using the API (from Step 4.2) and note the `code`.

### 7.2 Test Redirect in Browser

Open in browser:
```
http://localhost:3000/s/{code}
```

**Expected Behavior**:
- Page redirects to: `/{locale}/v/{slug}?src=share`
- Video page loads correctly
- URL includes `?src=share` parameter

### 7.3 Test Invalid Code

Open in browser:
```
http://localhost:3000/s/invalid123
```

**Expected**: 404 page shown

## Step 8: Test Copy Share Link Button

### 8.1 Navigate to Edit Page

1. Login to creator dashboard
2. Navigate to: `/{locale}/dashboard/videos/{videoId}/edit`
3. Scroll to action buttons section

**Expected**: "Copy Share Link" button visible

### 8.2 Test Button Functionality

1. Click "Copy Share Link" button
2. Wait for "Preparing..." state
3. Button should show "Copied!" for 2 seconds
4. Check clipboard contains short URL

**Verification**:
```bash
# On macOS, check clipboard:
pbpaste

# Should contain URL like:
# http://localhost:3000/s/abc123
```

### 8.3 Test Idempotency in UI

1. Click "Copy Share Link" again
2. Should reuse same code (no new link created)
3. Clipboard should contain same URL

## Step 9: Test Permission Rules

### 9.1 Test Owner Access

1. Login as video owner
2. Navigate to video edit page
3. Click "Copy Share Link"
4. **Expected**: Link created successfully

### 9.2 Test Admin Access

1. Login as admin user
2. Navigate to any video edit page
3. Click "Copy Share Link"
4. **Expected**: Link created successfully

### 9.3 Test Non-Owner Access

1. Login as different user (not owner, not admin)
2. Try to access: `POST /videos/{other_user_video_id}/share`
3. **Expected**: `403 Forbidden`

## Step 10: Test Public Access Rules

### 10.1 Test PUBLISHED + PUBLIC Video

1. Create short link for PUBLISHED + PUBLIC video
2. Resolve short link: `GET /short-links/{code}`
3. **Expected**: Returns redirect target

### 10.2 Test PUBLISHED + UNLISTED Video

1. Create short link for PUBLISHED + UNLISTED video
2. Resolve short link
3. **Expected**: Returns redirect target

### 10.3 Test Non-Public Video

1. Create short link for DRAFT/READY/PRIVATE video
2. Resolve short link
3. **Expected**: `404 Not Found` (even though link exists)

## Step 11: Test Analytics Attribution

### 11.1 Access Video via Short Link

1. Open short link in browser: `http://localhost:3000/s/{code}`
2. Video should load with `?src=share` in URL
3. Play video

### 11.2 Verify Analytics Event

Check analytics events (if Day 20 implemented):

```bash
# Query analytics for the video
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos/{videoId}/analytics"
```

**Expected**: Traffic source shows `share` for events from short link

## Step 12: Environment Variables

Verify environment variables are set:

```bash
# Check API .env
grep "NEXT_PUBLIC_APP_URL\|APP_BASE_URL" apps/api/.env

# Check web .env
grep "NEXT_PUBLIC_APP_URL\|NEXT_PUBLIC_API_URL" apps/web/.env
```

**Required**:
- `NEXT_PUBLIC_APP_URL` or `APP_BASE_URL` in API (for short URL generation)
- `NEXT_PUBLIC_API_URL` in Web (for API calls)

**Example**:
```bash
# In apps/api/.env or root .env
NEXT_PUBLIC_APP_URL=http://localhost:3000
# Or
APP_BASE_URL=http://localhost:3000

# In apps/web/.env or root .env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Step 13: Final Verification Checklist

### Backend ✅
- [ ] Migration applied successfully
- [ ] `POST /videos/:id/share` creates short link
- [ ] `GET /short-links/:code` resolves correctly
- [ ] Idempotency works (same code returned)
- [ ] Permission checks work (owner/admin only)
- [ ] Public access rules enforced (PUBLISHED + PUBLIC/UNLISTED only)
- [ ] Invalid codes return 404

### Frontend ✅
- [ ] `/s/{code}` route redirects correctly
- [ ] Redirect includes `?src=share`
- [ ] Copy Share Link button appears on edit page
- [ ] Button generates link on first click
- [ ] Button reuses link on subsequent clicks
- [ ] Clipboard copy works
- [ ] Loading/success states work
- [ ] Invalid codes show 404

### Integration ✅
- [ ] Short links redirect to correct video
- [ ] Analytics attribution works (`src=share`)
- [ ] Locale handling works
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

### Issue: API returns 500 on create

**Check**:
- User has valid JWT token
- User is video owner or admin
- Video exists in database

**Debug**:
```bash
# Check API logs for error details
# Verify Prisma client is up to date
cd apps/api
pnpm prisma generate
```

### Issue: Redirect doesn't work

**Check**:
- Next.js server is running
- Route file exists: `apps/web/src/app/s/[code]/page.tsx`
- API endpoint returns correct format

**Debug**:
```bash
# Test API directly
curl "http://localhost:3001/short-links/{code}?locale=en"

# Check Next.js console for errors
```

### Issue: Button doesn't appear

**Check**:
- Component imported correctly
- Video status allows button (READY, REJECTED, PENDING_APPROVAL, APPROVED, PUBLISHED)
- No JavaScript errors in console

**Debug**:
```bash
# Check browser console
# Verify component file exists
ls apps/web/src/components/CopyShareLinkButton.tsx
```

## Day 23 LOCK Criteria

Day 23 is LOCKED when:

✅ Short link created per video (idempotent)
✅ `/s/{code}` redirects to canonical route with `?src=share`
✅ Only PUBLISHED + PUBLIC/UNLISTED videos resolve
✅ Inaccessible videos return 404 (no info leakage)
✅ Creator can copy short link from UI
✅ Analytics attribution works (`src=share`)
✅ Permission checks enforced (owner/admin only)

## Next Steps After Day 23

- Add share button to public video pages
- Add share button to creator dashboard video list
- Add QR code generation
- Add link analytics/click tracking
- Add campaign link support
