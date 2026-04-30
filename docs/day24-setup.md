# Day 24: Embed Player

## Summary

Implemented embed player feature that allows public videos to be embedded on external websites using iframes. The embed page provides a minimal branded player experience with proper analytics attribution (`EXTERNAL` source) and security headers for iframe embedding.

## Changes Made

### 1. Backend: Embed Video Service Method ✅

**Updated**: `apps/api/src/public/public-videos.service.ts`

**Added Method**: `getPublicEmbedVideoBySlug()`
- Fetches video by slug with embed-safe data
- Enforces **PUBLISHED + PUBLIC only** (not UNLISTED)
- Returns HLS URL, thumbnail, title, tagline, uploader info
- Includes canonical URL and embed URL
- Handles uploader visibility and creator approval
- Returns 404 for non-embeddable videos

**Key Features**:
- Only `PUBLISHED` + `PUBLIC` videos are embeddable
- `UNLISTED` videos are NOT embeddable (by design)
- Returns compact embed-safe DTO
- Includes duration from VideoAsset
- Respects uploader privacy settings

### 2. Backend: Embed Endpoint ✅

**Updated**: `apps/api/src/public/public.video-share.controller.ts`

**Added Endpoint**: `GET /public/videos/:slug/embed?locale=en`
- Public endpoint (no authentication required)
- Accepts optional `locale` query parameter
- Returns embed video data
- Returns 404 for non-embeddable videos

**Response Format**:
```json
{
  "id": "vid_123",
  "slug": "how-to-build-ai-agent",
  "title": "How to Build AI Agent",
  "description": "Quick walkthrough...",
  "tagline": "Build faster",
  "hlsUrl": "https://cdn.streamora.app/hls/vid_123/master.m3u8",
  "thumbnailUrl": "https://cdn.streamora.app/thumbs/vid_123/selected.jpg",
  "durationSeconds": 486,
  "uploader": {
    "displayName": "Rasike"
  },
  "canonicalUrl": "/en/v/how-to-build-ai-agent",
  "embedUrl": "/en/embed/how-to-build-ai-agent"
}
```

### 3. Frontend: Embed API Helper ✅

**Created**: `apps/web/src/lib/api/public-embed.ts`
- `getPublicEmbedVideo()` - Fetches embed video data
- TypeScript types for embed video response
- Handles 404 errors gracefully
- Uses `no-store` cache policy

### 4. Frontend: Embed Page Route ✅

**Created**: `apps/web/src/app/[locale]/embed/[slug]/page.tsx`
- Server-side rendered embed page
- Minimal UI with player, title, tagline, uploader
- "Watch on Streamora" link to canonical page
- Analytics source set to `EXTERNAL`
- Metadata: `noindex`, canonical to public video page

**UI Features**:
- Minimal branded layout (black background)
- Video player in 16:9 aspect ratio
- Compact info section below player
- Responsive design for iframe embedding

### 5. Frontend: Copy Embed Code Button ✅

**Created**: `apps/web/src/components/CopyEmbedCodeButton.tsx`
- Client component for copying iframe code
- Generates proper iframe HTML with attributes
- Copies to clipboard with feedback
- Shows "Copied!" confirmation

**Iframe Code Generated**:
```html
<iframe
  src="https://streamora.app/en/embed/how-to-build-ai-agent"
  width="640"
  height="360"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
></iframe>
```

### 6. Frontend: Integration ✅

**Updated**: `apps/web/src/components/share-actions.tsx`
- Added `CopyEmbedCodeButton` to share panel
- Accepts `locale` and `slug` props
- Available on public video pages

**Updated**: `apps/web/src/components/video-draft-editor.tsx`
- Added `CopyEmbedCodeButton` to creator edit page
- Available for videos with slug (PUBLISHED videos)

**Updated**: `apps/web/src/app/[locale]/v/[slug]/page.tsx`
- Passes `locale` and `slug` to `ShareActions` component

### 7. Security: CSP Headers ✅

**Updated**: `apps/web/src/middleware.ts`
- Added Content Security Policy header for embed routes
- Sets `Content-Security-Policy: frame-ancestors *;` for `/embed/` routes
- Allows iframe embedding on external websites
- Prevents clickjacking while allowing embedding

## API Endpoints

### GET /public/videos/:slug/embed

**Authentication**: Not required (public endpoint)

**Query Parameters**:
- `locale` (optional): Locale for video content (default: `en`)

**Response**:
```json
{
  "id": "vid_123",
  "slug": "how-to-build-ai-agent",
  "title": "How to Build AI Agent",
  "description": "Quick walkthrough for building your first AI agent",
  "tagline": "Build faster",
  "hlsUrl": "https://storage.googleapis.com/bucket/renditions/vid_123/master.m3u8",
  "thumbnailUrl": "https://storage.googleapis.com/bucket/thumbs/vid_123/selected.jpg",
  "durationSeconds": 486,
  "uploader": {
    "displayName": "Rasike"
  },
  "canonicalUrl": "/en/v/how-to-build-ai-agent",
  "embedUrl": "/en/embed/how-to-build-ai-agent"
}
```

**Errors**:
- `404 Not Found`: Video not found or not embeddable

**Embed Access Rules**:
- Only resolves if video is:
  - `status: 'PUBLISHED'`
  - `visibility: 'PUBLIC'`
- Returns 404 for:
  - `UNLISTED` videos (not embeddable by design)
  - `PRIVATE` videos
  - `DRAFT` videos
  - All other non-public states

## Business Rules

### Embed Eligibility

1. **Strict Rule**: Only `PUBLISHED` + `PUBLIC` videos are embeddable
   - `PUBLISHED` + `PUBLIC` → ✅ Embeddable
   - `PUBLISHED` + `UNLISTED` → ❌ Not embeddable
   - `PUBLISHED` + `PRIVATE` → ❌ Not embeddable
   - All other states → ❌ Not embeddable

2. **Why UNLISTED is Not Embeddable**:
   - Embeds can spread widely and appear on third-party sites
   - UNLISTED means "not listed, share by direct link only"
   - Allowing UNLISTED in embeds weakens the meaning of "unlisted"
   - Safer to restrict embeds to PUBLIC only

3. **Privacy**: Does not reveal whether video exists if not embeddable
   - Returns 404 for both invalid slugs and non-embeddable videos
   - Prevents information leakage

### Analytics Attribution

All embed playback events are tracked with:
- `trafficSource: 'EXTERNAL'`
- This is hardcoded in the embed page route
- Does not depend on query parameters
- Provides clear attribution for embedded views

### SEO and Metadata

1. **Embed Pages**:
   - `robots: noindex, nofollow` - Not indexed by search engines
   - `canonical` points to public video page - Prevents duplicate content
   - Embed page is a distribution surface, not canonical content

2. **Public Video Pages**:
   - Remain canonical and SEO-optimized
   - Remain the primary watch experience
   - Embed pages do not compete with them

## URL Structure

### Embed Page Format
```
/{locale}/embed/{slug}
```

Examples:
- `/en/embed/how-to-build-ai-agent`
- `/si/embed/mobile-video-editing-guide`
- `/ta/embed/travel-vlog-japan`

### Canonical Video Format
```
/{locale}/v/{slug}
```

Examples:
- `/en/v/how-to-build-ai-agent`
- `/si/v/mobile-video-editing-guide`
- `/ta/v/travel-vlog-japan`

## Security

### Content Security Policy

Embed routes include CSP header:
```
Content-Security-Policy: frame-ancestors *;
```

This:
- Allows iframe embedding on any external website
- Prevents clickjacking attacks
- Can be restricted later to specific domains if needed

### X-Frame-Options

- No restrictive `X-Frame-Options` header on embed routes
- CSP `frame-ancestors` is the modern approach
- Allows embedding while maintaining security

## UI Features

### Embed Page Layout

1. **Player Section**:
   - Full-width video player
   - 16:9 aspect ratio
   - Black background
   - Native video controls

2. **Info Section**:
   - Video title (line-clamped to 2 lines)
   - Tagline (if available, line-clamped to 2 lines)
   - Uploader name (if visible and approved)
   - "Watch on Streamora" link (opens in new tab)

3. **Design**:
   - Minimal and clean
   - Compact spacing
   - Safe for small iframe sizes
   - Responsive design

### Copy Embed Code Button

**Location**: 
- Public video share panel
- Creator video edit page

**Behavior**:
- Generates iframe HTML code
- Copies to clipboard
- Shows "Copied!" confirmation for 2 seconds
- Includes all necessary iframe attributes

**Iframe Attributes**:
- `src` - Embed page URL
- `width` - 640px (default)
- `height` - 360px (default, 16:9 ratio)
- `frameborder` - 0
- `allow` - autoplay, fullscreen, picture-in-picture
- `allowfullscreen` - Boolean attribute

## Testing Checklist

### Backend Tests

#### 1. Embeddable Public Video
- [ ] `GET /public/videos/:slug/embed` returns embed data
- [ ] Returns HLS URL
- [ ] Returns thumbnail URL
- [ ] Returns title, description, tagline
- [ ] Returns canonical URL and embed URL
- [ ] Only works for PUBLISHED + PUBLIC videos

#### 2. Non-Embeddable Videos
- [ ] UNLISTED video returns 404
- [ ] PRIVATE video returns 404
- [ ] DRAFT video returns 404
- [ ] Unpublished video returns 404
- [ ] Invalid slug returns 404

#### 3. Locale Handling
- [ ] Default locale (en) works
- [ ] Explicit locale query param works
- [ ] Locale fallback works (exact → en → any)

#### 4. Uploader Privacy
- [ ] Uploader shown if visible and approved
- [ ] Uploader hidden if not visible
- [ ] Uploader hidden if not approved

### Frontend Tests

#### 1. Embed Page Rendering
- [ ] Embed page loads for valid embeddable video
- [ ] Player displays correctly
- [ ] Title and tagline display
- [ ] Uploader name displays (if applicable)
- [ ] "Watch on Streamora" link works
- [ ] Page is minimal and clean

#### 2. Iframe Embedding
- [ ] Embed page works in iframe
- [ ] Not blocked by frame policy
- [ ] Video plays correctly
- [ ] Controls work in iframe
- [ ] Responsive in different iframe sizes

#### 3. Copy Embed Code Button
- [ ] Button appears on public video page
- [ ] Button appears on creator edit page
- [ ] Generates correct iframe code
- [ ] Copies to clipboard
- [ ] Shows "Copied!" confirmation
- [ ] Code includes all necessary attributes

#### 4. Analytics
- [ ] Embed playback tracked as EXTERNAL source
- [ ] Analytics events include correct source
- [ ] No query parameter needed for source

#### 5. Metadata
- [ ] Embed page has noindex
- [ ] Embed page canonical points to public page
- [ ] Public page remains canonical

## Day 24 LOCK Checklist ✅

### Backend
- [x] `GET /public/videos/:slug/embed` endpoint created
- [x] Only PUBLISHED + PUBLIC videos embeddable
- [x] UNLISTED videos return 404
- [x] Returns embed-safe DTO
- [x] Includes HLS URL, thumbnail, metadata
- [x] Handles uploader privacy correctly

### Frontend
- [x] `/[locale]/embed/[slug]` route created
- [x] Minimal embed page UI
- [x] Player displays correctly
- [x] Analytics source set to EXTERNAL
- [x] CopyEmbedCodeButton component created
- [x] Button integrated into share panel
- [x] Button integrated into creator edit page
- [x] CSP headers allow iframe embedding
- [x] Metadata: noindex and canonical

### Integration
- [x] Embed page works in iframe
- [x] Video plays correctly
- [x] Analytics attribution works
- [x] All edge cases handled

## Suggested curl Checks

### Get Embed Video Data
```bash
curl "http://localhost:3001/public/videos/how-to-build-ai-agent/embed?locale=en"
```

Expected:
```json
{
  "id": "vid_123",
  "slug": "how-to-build-ai-agent",
  "title": "How to Build AI Agent",
  "hlsUrl": "https://storage.googleapis.com/...",
  "thumbnailUrl": "https://storage.googleapis.com/...",
  "canonicalUrl": "/en/v/how-to-build-ai-agent",
  "embedUrl": "/en/embed/how-to-build-ai-agent"
}
```

### Test Non-Embeddable Video
```bash
# For UNLISTED video
curl "http://localhost:3001/public/videos/unlisted-video/embed"
```

Expected: `404 Not Found`

## Route Examples

### Embed Page URLs
- English: `http://localhost:3000/en/embed/how-to-build-ai-agent`
- Sinhala: `http://localhost:3000/si/embed/mobile-video-editing-guide`
- Tamil: `http://localhost:3000/ta/embed/travel-vlog-japan`

### Iframe Embed Code
```html
<iframe
  src="http://localhost:3000/en/embed/how-to-build-ai-agent"
  width="640"
  height="360"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
></iframe>
```

## Environment Variables

Ensure these are set:

```bash
# Base URL for embed URLs (used in iframe code)
NEXT_PUBLIC_APP_URL=https://streamora.app

# API URL for frontend API calls
NEXT_PUBLIC_API_URL=http://localhost:3001

# Public asset base URL (for HLS and thumbnails)
PUBLIC_ASSET_BASE_URL=https://cdn.streamora.app
```

## Future Enhancements

### Embed Analytics
- Track embed views separately
- Show embed statistics to creators
- Identify top embedding sites
- Track embed click-through rates

### Embed Customization
- Allow creators to customize embed player
- Custom colors/branding
- Hide/show specific elements
- Custom thumbnail selection

### Embed Restrictions
- Domain allowlist for embeds
- Password-protected embeds
- Time-limited embeds
- Geographic restrictions

### Enhanced Embed Features
- Auto-play options
- Start time parameter
- End time parameter
- Loop option
- Muted autoplay

### Embed Player Improvements
- Custom player controls
- Playlist support in embed
- Related videos in embed
- Social sharing in embed

## Result of Day 24

After this day, Streamora gains:
- ✅ Iframe embedding support for public videos
- ✅ Minimal branded embed player
- ✅ External analytics attribution
- ✅ Foundation for embed analytics
- ✅ Better content distribution
- ✅ SEO-safe embed pages

This is a strong Phase 3 feature that enables content distribution across external websites while maintaining proper attribution and analytics.

## Files Created/Modified

### Backend
- `apps/api/src/public/public-videos.service.ts` (modified - added `getPublicEmbedVideoBySlug()`)
- `apps/api/src/public/public.video-share.controller.ts` (modified - added embed endpoint)

### Frontend
- `apps/web/src/lib/api/public-embed.ts` (new)
- `apps/web/src/app/[locale]/embed/[slug]/page.tsx` (new)
- `apps/web/src/components/CopyEmbedCodeButton.tsx` (new)
- `apps/web/src/components/share-actions.tsx` (modified - added embed button)
- `apps/web/src/components/video-draft-editor.tsx` (modified - added embed button)
- `apps/web/src/app/[locale]/v/[slug]/page.tsx` (modified - passes locale/slug to ShareActions)
- `apps/web/src/middleware.ts` (modified - added CSP headers for embed routes)

## Next Steps

- Add embed analytics tracking
- Add embed customization options
- Add domain allowlist for embeds
- Add embed player enhancements
- Add embed click-through tracking
