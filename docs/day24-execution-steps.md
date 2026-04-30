# Day 24: Embed Player - Execution Steps

## Prerequisites

- Day 20 (Analytics) completed
- Day 23 (Short Share Links) completed (optional but recommended)
- Database accessible
- API and Web apps running
- At least one PUBLISHED + PUBLIC video available for testing

## Step 1: Verify Backend Files

Confirm all backend files are in place:

```bash
# Check service method exists
grep "getPublicEmbedVideoBySlug" apps/api/src/public/public-videos.service.ts

# Check controller endpoint exists
grep "public/videos/:slug/embed" apps/api/src/public/public.video-share.controller.ts

# Verify service is injected in controller
grep "PublicVideosService" apps/api/src/public/public.video-share.controller.ts
```

**Expected**: All files should contain the embed-related code

## Step 2: Restart API Server

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

## Step 3: Test Backend Embed Endpoint

### 3.1 Test Embeddable Public Video

```bash
# Replace SLUG with actual video slug (PUBLISHED + PUBLIC)
curl "http://localhost:3001/public/videos/SLUG/embed?locale=en"
```

**Expected Response**:
```json
{
  "id": "vid_123",
  "slug": "video-slug",
  "title": "Video Title",
  "description": "Video description",
  "tagline": "Video tagline",
  "hlsUrl": "https://storage.googleapis.com/...",
  "thumbnailUrl": "https://storage.googleapis.com/...",
  "durationSeconds": 486,
  "uploader": {
    "displayName": "Creator Name"
  },
  "canonicalUrl": "/en/v/video-slug",
  "embedUrl": "/en/embed/video-slug"
}
```

**Verification**:
- Response contains all required fields
- `hlsUrl` is valid
- `thumbnailUrl` is valid (if available)
- `canonicalUrl` and `embedUrl` are correct
- Only works for PUBLISHED + PUBLIC videos

### 3.2 Test UNLISTED Video (Should Fail)

```bash
# Replace SLUG with UNLISTED video slug
curl "http://localhost:3001/public/videos/UNLISTED_SLUG/embed"
```

**Expected**: `404 Not Found`

**Verification**:
- UNLISTED videos are NOT embeddable
- Returns 404 (does not reveal video exists)

### 3.3 Test PRIVATE Video (Should Fail)

```bash
# Replace SLUG with PRIVATE video slug
curl "http://localhost:3001/public/videos/PRIVATE_SLUG/embed"
```

**Expected**: `404 Not Found`

### 3.4 Test Invalid Slug

```bash
curl "http://localhost:3001/public/videos/invalid-slug-12345/embed"
```

**Expected**: `404 Not Found`

### 3.5 Test Locale Parameter

```bash
# Test with different locales
curl "http://localhost:3001/public/videos/SLUG/embed?locale=si"
curl "http://localhost:3001/public/videos/SLUG/embed?locale=ta"
```

**Expected**: Returns video data with locale-specific translations

## Step 4: Verify Frontend Files

Confirm all frontend files are in place:

```bash
# Check API helper
ls apps/web/src/lib/api/public-embed.ts

# Check embed page route
ls apps/web/src/app/[locale]/embed/[slug]/page.tsx

# Check embed button component
ls apps/web/src/components/CopyEmbedCodeButton.tsx

# Verify integration in share actions
grep "CopyEmbedCodeButton" apps/web/src/components/share-actions.tsx

# Verify integration in video editor
grep "CopyEmbedCodeButton" apps/web/src/components/video-draft-editor.tsx

# Verify middleware has CSP headers
grep "frame-ancestors" apps/web/src/middleware.ts
```

## Step 5: Restart Web Server

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

## Step 6: Test Embed Page

### 6.1 Open Embed Page in Browser

Open in browser:
```
http://localhost:3000/en/embed/{slug}
```

Replace `{slug}` with a PUBLISHED + PUBLIC video slug.

**Expected Behavior**:
- Page loads with minimal black layout
- Video player displays
- Title and tagline show below player
- Uploader name shows (if visible and approved)
- "Watch on Streamora" link appears
- Page is minimal and clean

### 6.2 Test Non-Embeddable Video

Open in browser:
```
http://localhost:3000/en/embed/{unlisted-slug}
```

**Expected**: 404 page shown

### 6.3 Test Different Locales

Open in browser:
```
http://localhost:3000/si/embed/{slug}
http://localhost:3000/ta/embed/{slug}
```

**Expected**: Embed page loads with locale-specific content

## Step 7: Test Iframe Embedding

### 7.1 Create Test HTML File

Create a test file `test-embed.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Embed Test</title>
</head>
<body>
  <h1>Embedded Video Test</h1>
  <iframe
    src="http://localhost:3000/en/embed/{slug}"
    width="640"
    height="360"
    frameborder="0"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
  ></iframe>
</body>
</html>
```

Replace `{slug}` with a PUBLISHED + PUBLIC video slug.

### 7.2 Open Test File

Open `test-embed.html` in a browser.

**Expected Behavior**:
- Iframe loads without errors
- Video player displays inside iframe
- Video can be played
- Controls work
- Not blocked by frame policy

### 7.3 Test CSP Headers

Check that CSP headers are set correctly:

```bash
curl -I "http://localhost:3000/en/embed/{slug}"
```

**Expected**: Response includes:
```
Content-Security-Policy: frame-ancestors *;
```

## Step 8: Test Copy Embed Code Button

### 8.1 Test on Public Video Page

1. Navigate to a public video page: `/{locale}/v/{slug}`
2. Scroll to share actions section
3. Find "Copy Embed Code" button

**Expected**: Button appears in share panel

### 8.2 Test Button Functionality

1. Click "Copy Embed Code" button
2. Button should show "Copied!" for 2 seconds
3. Check clipboard contains iframe code

**Verification**:
```bash
# On macOS, check clipboard:
pbpaste

# Should contain iframe code like:
# <iframe
#   src="http://localhost:3000/en/embed/video-slug"
#   width="640"
#   height="360"
#   frameborder="0"
#   allow="autoplay; fullscreen; picture-in-picture"
#   allowfullscreen
# ></iframe>
```

### 8.3 Test on Creator Edit Page

1. Login to creator dashboard
2. Navigate to: `/{locale}/dashboard/videos/{videoId}/edit`
3. Find "Copy Embed Code" button

**Expected**: Button appears in action buttons section

### 8.4 Test Button on Edit Page

1. Click "Copy Embed Code" button
2. Verify iframe code is copied
3. Verify code includes correct locale and slug

## Step 9: Test Analytics Attribution

### 9.1 Play Embedded Video

1. Open embed page: `/{locale}/embed/{slug}`
2. Play the video
3. Let it play for a few seconds

### 9.2 Verify Analytics Events

Check analytics events (if Day 20 implemented):

```bash
# Get authentication token first
export TOKEN="your_jwt_token_here"

# Query analytics for the video
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos/{videoId}/analytics"
```

**Expected**: Analytics events show `trafficSource: 'EXTERNAL'` for embed playback

### 9.3 Compare with Public Page

1. Play the same video on public page: `/{locale}/v/{slug}`
2. Check analytics events

**Expected**: Public page shows different traffic source (DIRECT, SHARE, etc.), not EXTERNAL

## Step 10: Test Metadata

### 10.1 Check Embed Page Metadata

Inspect embed page source or use curl:

```bash
curl "http://localhost:3000/en/embed/{slug}" | grep -i "robots\|canonical"
```

**Expected**:
- `robots: noindex, nofollow` in metadata
- `canonical` points to public video page: `/{locale}/v/{slug}`

### 10.2 Verify Public Page Remains Canonical

```bash
curl "http://localhost:3000/en/v/{slug}" | grep -i "canonical"
```

**Expected**: Public page has canonical pointing to itself

## Step 11: Test Edge Cases

### 11.1 Video Without Thumbnail

Test embed page for video without thumbnail:

**Expected**: Player still works, no thumbnail shown

### 11.2 Video Without Uploader

Test embed page for video with hidden uploader:

**Expected**: Shows "Streamora" instead of uploader name

### 11.3 Video Without Tagline

Test embed page for video without tagline:

**Expected**: Tagline section hidden, only title shown

### 11.4 Long Title/Tagline

Test embed page for video with very long title:

**Expected**: Title line-clamped to 2 lines

## Step 12: Final Verification Checklist

### Backend ✅
- [ ] `GET /public/videos/:slug/embed` returns embed data
- [ ] Only PUBLISHED + PUBLIC videos embeddable
- [ ] UNLISTED videos return 404
- [ ] PRIVATE videos return 404
- [ ] Invalid slugs return 404
- [ ] Locale parameter works
- [ ] Uploader privacy respected

### Frontend ✅
- [ ] Embed page route works: `/{locale}/embed/{slug}`
- [ ] Embed page renders correctly
- [ ] Video player displays
- [ ] Title and tagline show
- [ ] Uploader name shows (if applicable)
- [ ] "Watch on Streamora" link works
- [ ] Copy Embed Code button appears
- [ ] Button copies iframe code correctly
- [ ] CSP headers allow iframe embedding
- [ ] Metadata: noindex and canonical

### Integration ✅
- [ ] Embed page works in iframe
- [ ] Video plays in iframe
- [ ] Analytics source is EXTERNAL
- [ ] All edge cases handled

## Troubleshooting

### Issue: Embed endpoint returns 404

**Check**:
- Video is PUBLISHED + PUBLIC (not UNLISTED)
- Video slug is correct
- API server is running

**Debug**:
```bash
# Test endpoint directly
curl "http://localhost:3001/public/videos/{slug}/embed?locale=en"

# Check video status in database
# Video must be: status='PUBLISHED' AND visibility='PUBLIC'
```

### Issue: Embed page doesn't load

**Check**:
- Web server is running
- Route file exists: `apps/web/src/app/[locale]/embed/[slug]/page.tsx`
- API endpoint returns correct format

**Debug**:
```bash
# Test API directly
curl "http://localhost:3001/public/videos/{slug}/embed?locale=en"

# Check Next.js console for errors
# Verify API URL is set: NEXT_PUBLIC_API_URL
```

### Issue: Iframe is blocked

**Check**:
- CSP headers are set in middleware
- Middleware is processing embed routes
- No global X-Frame-Options blocking

**Debug**:
```bash
# Check headers
curl -I "http://localhost:3000/en/embed/{slug}"

# Should include:
# Content-Security-Policy: frame-ancestors *;
```

### Issue: Copy Embed Code button doesn't appear

**Check**:
- Component imported correctly
- Video has slug (PUBLISHED videos)
- No JavaScript errors in console

**Debug**:
```bash
# Check component file exists
ls apps/web/src/components/CopyEmbedCodeButton.tsx

# Check integration
grep "CopyEmbedCodeButton" apps/web/src/components/share-actions.tsx
```

### Issue: Analytics source not EXTERNAL

**Check**:
- Embed page uses `trafficSource="EXTERNAL"` in player
- Analytics tracking is working
- Events are being sent

**Debug**:
```bash
# Check analytics events
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos/{videoId}/analytics"

# Verify trafficSource field
```

## Day 24 LOCK Criteria

Day 24 is LOCKED when:

✅ Embed API endpoint works
✅ Embed page renders only for PUBLISHED + PUBLIC
✅ UNLISTED videos return 404
✅ Embedded iframe works on external test page
✅ Analytics source is EXTERNAL
✅ Embed page is minimal and branded
✅ Canonical still points to normal public video page
✅ Embed page is noindex
✅ CSP headers allow iframe embedding
✅ Copy Embed Code button works

## Next Steps After Day 24

- Add embed analytics tracking
- Add embed customization options
- Add domain allowlist for embeds
- Add embed player enhancements
- Add embed click-through tracking
