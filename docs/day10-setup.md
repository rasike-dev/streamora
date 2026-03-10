# Day 10 — Share Page + OG Tags + Social Share Buttons

## Summary

Implemented public share pages with locale-aware routing, Open Graph and Twitter metadata, social share buttons, and copy helpers. Videos can now be shared with proper previews on WhatsApp, Facebook, X, LinkedIn, etc.

## Changes Made

### 1. Public Share API Endpoint ✅

**Created**: `apps/api/src/public/public.video-share.controller.ts`
- **Endpoint**: `GET /public/videos/:slug?locale=en`
- Returns complete video data for share page:
  - Title, description, tagline (locale-aware)
  - Playback URL (HLS master)
  - Thumbnail URL (selected thumbnail)
  - Uploader (respects privacy rules)
  - Channels and tags
- Only returns **PUBLISHED** and **PUBLIC** videos
- Returns 404 for non-published or non-public videos

### 2. Public Share Page ✅

**Created**: `apps/web/src/app/[locale]/v/[slug]/page.tsx`
- **Route**: `/[locale]/v/[slug]` (e.g., `/en/v/my-video-slug`)
- Server-side rendered with Next.js App Router
- Displays:
  - Video title, tagline, description
  - HLS video player
  - Share actions component
  - Metadata (channels, tags)
  - Uploader (if visible)

### 3. Open Graph & Twitter Metadata ✅

**Added**: `generateMetadata()` function in share page
- **Open Graph tags**:
  - `og:title`, `og:description`, `og:url`, `og:image`
  - `og:type: video.other`
  - `og:site_name: Streamora`
- **Twitter Card**:
  - `twitter:card: summary_large_image`
  - `twitter:title`, `twitter:description`, `twitter:image`
- **Canonical URL** for SEO

### 4. Reusable HLS Player Component ✅

**Created**: `apps/web/src/components/hls-player.tsx`
- Client-side component for HLS playback
- Uses native HLS on Safari/iOS
- Uses hls.js on Chrome/Firefox
- Supports poster image (thumbnail)
- Responsive design

### 5. Share Actions Component ✅

**Created**: `apps/web/src/components/share-actions.tsx`
- **Social Share Buttons**:
  - WhatsApp
  - Facebook
  - X (Twitter)
  - LinkedIn
- **Copy Actions**:
  - Copy Title
  - Copy Tagline
  - Copy Caption (title + tagline + description + URL)
- Shows share URL
- Visual feedback when copying

### 6. Integration Updates ✅

**Updated**: Admin moderation page
- Added "Share Page" link for published videos

**Updated**: Dashboard
- Added "Share Page" link for published videos

## Route Structure

```
/[locale]/v/[slug]
```

**Examples**:
- `/en/v/my-video-slug` (English)
- `/si/v/my-video-slug` (Sinhala)
- `/ta/v/my-video-slug` (Tamil)

## API Endpoint

### GET /public/videos/:slug

**Query Parameters**:
- `locale` (optional, default: `en`)

**Response**:
```json
{
  "id": "clx123abc",
  "slug": "my-video-slug",
  "title": "My Video Title",
  "description": "Video description...",
  "tagline": "Short tagline",
  "uploader": "Creator Name",
  "createdAt": "2024-01-01T00:00:00Z",
  "playbackUrl": "https://storage.googleapis.com/.../master.m3u8",
  "thumbnailUrl": "https://storage.googleapis.com/.../thumb_0.jpg",
  "channels": [
    { "slug": "tech", "name": "Technology" }
  ],
  "tags": [
    { "slug": "tutorial", "name": "Tutorial" }
  ]
}
```

**Errors**:
- `404 Not Found`: Video not found or not published/public

## Environment Variables

**Required in `apps/web/.env.local`**:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**Important**: `NEXT_PUBLIC_APP_URL` must be an absolute URL for OG metadata to work correctly.

## Social Share URLs

### WhatsApp
```
https://wa.me/?text={title}%0A{url}
```

### Facebook
```
https://www.facebook.com/sharer/sharer.php?u={url}
```

### X (Twitter)
```
https://twitter.com/intent/tweet?url={url}&text={title} — {tagline}
```

### LinkedIn
```
https://www.linkedin.com/sharing/share-offsite/?url={url}
```

## Testing

### 1. Test Share Page

1. Publish a video via admin moderation
2. Visit: `http://localhost:3000/en/v/{slug}`
3. **Verify**:
   - Page loads with video details
   - Video player works
   - Share buttons are visible
   - Copy actions work

### 2. Test OG Metadata

1. View page source: `http://localhost:3000/en/v/{slug}`
2. **Verify**:
   - `<meta property="og:title">` exists
   - `<meta property="og:description">` exists
   - `<meta property="og:image">` exists
   - `<meta name="twitter:card">` exists

### 3. Test Social Share Preview

**Option 1: Use Debuggers**
- **Facebook**: https://developers.facebook.com/tools/debug/
- **Twitter**: https://cards-dev.twitter.com/validator
- **LinkedIn**: https://www.linkedin.com/post-inspector/

**Option 2: Share Test**
1. Copy share URL
2. Paste in WhatsApp/Facebook/X/LinkedIn
3. **Verify**: Preview shows title, description, and thumbnail

### 4. Test Locale Support

1. Visit: `/si/v/{slug}` (Sinhala)
2. **Verify**: Sinhala title/description if available, else English fallback
3. Visit: `/ta/v/{slug}` (Tamil)
4. **Verify**: Tamil title/description if available, else English fallback

### 5. Test Uploader Privacy

1. Publish video from **CREATOR_PENDING** user
2. **Verify**: Uploader name is hidden on share page
3. Approve creator via `/admin/users/:id/creator-approve`
4. **Verify**: Uploader name now appears on share page

## Day 10 LOCK Checklist ✅

- [ ] Public share page exists at `/[locale]/v/{slug}`
- [ ] Page renders title, tagline, description, playback
- [ ] `generateMetadata()` sets OG and Twitter tags
- [ ] WhatsApp/Facebook/X/LinkedIn buttons open correct share URLs
- [ ] Copy title/tagline/caption works
- [ ] Page respects uploader privacy rules
- [ ] Only PUBLISHED + PUBLIC videos can be opened
- [ ] Locale-aware share URLs work for `/si/v/...` and `/ta/v/...`
- [ ] OG metadata shows correct preview in social platforms

## Troubleshooting

### "Video not found" on share page

- Check video status is **PUBLISHED**
- Check video visibility is **PUBLIC**
- Verify slug is correct

### OG metadata not showing

- Verify `NEXT_PUBLIC_APP_URL` is set correctly
- Check that thumbnail URL is accessible (public GCS bucket)
- Use Facebook/Twitter debuggers to refresh cache

### Share buttons not working

- Check that URLs are properly encoded
- Verify social platform URLs are correct
- Test in different browsers

### Locale not working

- Verify translation exists in database
- Check API returns correct locale
- Verify fallback to English works

## Next Steps

After Day 10 is locked:
- **Day 11**: Channels/Tags + Filters (basic)
- **Day 12**: Stabilization (quotas, retries, logs)

## Notes

- Share page is public (no authentication required)
- Uploader privacy is enforced (only shown if creator approved and `uploaderVisible=true`)
- Thumbnail selection: Uses `isSelected=true` thumbnail, or first thumbnail as fallback
- Playback URL: Only included if HLS is ready (asset has `hlsBucket` and `hlsMasterKey`)
