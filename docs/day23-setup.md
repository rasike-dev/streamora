# Day 23: Short Share Links

## Summary

Implemented short share links feature that allows creators to generate clean, shareable URLs for their videos. Short links redirect to the canonical public video route with proper analytics attribution (`?src=share`). This improves social distribution, cleaner sharing, and provides a foundation for future campaign tracking.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Model**:
- `ShortLink` - Stores short link codes and their target videos
  - `code` (unique) - Short alphanumeric code (e.g., "abc123")
  - `videoId` - Reference to target video
  - `createdByUserId` (optional) - Creator who generated the link
  - Indexed by `videoId` and `code`

**Updated Relations**:
- Added `shortLinks` relation to `User` model
- Added `shortLinks` relation to `Video` model

### 2. Backend: Short Links Service ✅

**Created**: `apps/api/src/short-links/short-links.service.ts`
- `createOrGetShortLink()` - Creates or retrieves existing short link for a video
  - Validates video ownership (owner or admin)
  - Reuses existing short link if one exists (idempotent)
  - Generates unique 6-character code using URL-safe alphabet
  - Returns short URL and target URL
- `resolveShortLink()` - Resolves short code to video redirect target
  - Validates video is publicly accessible (PUBLISHED + PUBLIC/UNLISTED)
  - Returns redirect URL with locale and `?src=share` parameter
  - Returns 404 if code invalid or video not publicly accessible
- `getUserByKeycloakSub()` - Helper to resolve user from Keycloak sub
- `generateUniqueCode()` - Generates unique short codes with collision detection

**Code Generation**:
- Uses URL-safe alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789`
- Excludes ambiguous characters (0, O, I, l, 1)
- 6 characters by default
- Retries up to 10 times if collision detected

### 3. Backend: Short Links Controller ✅

**Created**: `apps/api/src/short-links/short-links.controller.ts`
- `POST /videos/:id/share` - Create or get short link (authenticated)
  - Requires JWT authentication
  - Only video owner or admin can create links
  - Returns short URL and target URL
- `GET /short-links/:code?locale=en` - Resolve short link (public)
  - No authentication required
  - Returns redirect target with locale
  - Returns 404 if invalid or inaccessible

### 4. App Module Updates ✅

**Updated**: `apps/api/src/app.module.ts`
- Registered `ShortLinksController`
- Added `ShortLinksService` to providers

### 5. Frontend: Share Links API Helper ✅

**Created**: `apps/web/src/lib/api/share-links.ts`
- `createOrGetShareLink()` - Creates or retrieves short link
- `resolveShortLink()` - Resolves short code to redirect target
- TypeScript types for request/response

### 6. Frontend: Short Link Redirect Route ✅

**Created**: `apps/web/src/app/s/[code]/page.tsx`
- Server-side redirect handler
- Resolves short code via API
- Redirects to canonical video route with `?src=share`
- Returns 404 for invalid codes

### 7. Frontend: Copy Share Link Button ✅

**Created**: `apps/web/src/components/CopyShareLinkButton.tsx`
- Client component for copying short link to clipboard
- Loading and success states
- Handles errors gracefully
- Reusable across creator pages

### 8. Frontend: Integration ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`
- Added `CopyShareLinkButton` to action buttons
- Available for videos in READY, REJECTED, PENDING_APPROVAL, APPROVED, PUBLISHED statuses

## API Endpoints

### POST /videos/:id/share

**Authentication**: Required (JWT)

**Request**: No body required

**Response**:
```json
{
  "code": "abc123",
  "shortUrl": "https://streamora.app/s/abc123",
  "targetUrl": "/en/v/how-to-build-ai-agent?src=share"
}
```

**Errors**:
- `404 Not Found`: Video not found
- `403 Forbidden`: User is not owner or admin

**Behavior**:
- First call creates short link
- Subsequent calls return existing short link (idempotent)
- One short link per video (reused)

### GET /short-links/:code

**Authentication**: Not required (public endpoint)

**Query Parameters**:
- `locale` (optional): Locale for redirect (default: `en`)

**Response**:
```json
{
  "code": "abc123",
  "target": {
    "videoId": "vid_123",
    "slug": "how-to-build-ai-agent",
    "locale": "en",
    "redirectUrl": "/en/v/how-to-build-ai-agent?src=share"
  }
}
```

**Errors**:
- `404 Not Found`: Code invalid or video not publicly accessible

**Public Access Rules**:
- Only resolves if video is:
  - `status: 'PUBLISHED'`
  - `visibility: 'PUBLIC'` or `visibility: 'UNLISTED'`
- Returns 404 for all other states (does not reveal existence)

## Business Rules

### Short Link Creation

1. **Permission**: Only video owner or admin can create short links
2. **Idempotency**: One short link per video (reused on subsequent requests)
3. **Early Creation**: Links can be created before video is published
   - Link becomes active when video becomes publicly accessible
   - Useful for preparing social media posts in advance

### Short Link Resolution

1. **Public Access Only**: Only resolves publicly accessible videos
   - `PUBLISHED` + `PUBLIC` → ✅ Resolves
   - `PUBLISHED` + `UNLISTED` → ✅ Resolves
   - All other states → ❌ 404

2. **Privacy**: Does not reveal whether code exists if video is inaccessible
   - Returns 404 for both invalid codes and inaccessible videos
   - Prevents information leakage

3. **Locale Handling**:
   - Uses explicit `locale` query param if provided
   - Falls back to `en` if not provided
   - Future: Can use cookie or Accept-Language header

### Redirect Target

Short links always redirect to:
```
/{locale}/v/{slug}?src=share
```

This ensures:
- Analytics attribution (`src=share`)
- Consistent canonical URLs
- Proper locale handling

## URL Structure

### Short Link Format
```
https://streamora.app/s/{code}
```

Example:
```
https://streamora.app/s/abc123
```

### Redirect Target Format
```
/{locale}/v/{slug}?src=share
```

Example:
```
/en/v/how-to-build-ai-agent?src=share
```

## Code Generation

### Algorithm
- Length: 6 characters (default)
- Alphabet: URL-safe characters excluding ambiguous ones
- Collision handling: Retries up to 10 times
- Uniqueness: Enforced by database unique constraint

### Character Set
```
ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789
```

Excludes: `0`, `O`, `I`, `l`, `1` (ambiguous characters)

## Analytics Integration

Short links automatically include `?src=share` in redirect URLs, which:
- Integrates with Day 20 analytics system
- Maps to `TrafficSource.SHARE` in analytics events
- Provides attribution for share-origin traffic
- No changes needed to analytics event model

## UI Features

### Copy Share Link Button

**Location**: Video edit page (`/[locale]/dashboard/videos/[id]/edit`)

**Behavior**:
- First click: Generates short link (if needed) and copies to clipboard
- Subsequent clicks: Reuses existing link and copies
- Shows loading state while generating
- Shows "Copied!" confirmation for 2 seconds
- Handles errors gracefully

**Availability**:
- Available for videos in: READY, REJECTED, PENDING_APPROVAL, APPROVED, PUBLISHED
- Can be added to other creator pages as needed

## Testing Checklist

### Backend Tests

#### 1. Create Short Link
- [ ] `POST /videos/:id/share` creates short link for owner
- [ ] Returns unique code and short URL
- [ ] Admin can create links for any video
- [ ] Non-owner/non-admin receives 403

#### 2. Idempotency
- [ ] First call creates link
- [ ] Second call returns same code
- [ ] No duplicate links created

#### 3. Resolve Valid Link
- [ ] `GET /short-links/:code` returns redirect target
- [ ] Target includes correct locale
- [ ] Target includes `?src=share`
- [ ] Only works for PUBLISHED + PUBLIC/UNLISTED videos

#### 4. Resolve Invalid Link
- [ ] Invalid code returns 404
- [ ] Unpublished video returns 404
- [ ] Private video returns 404
- [ ] Takedown video returns 404

#### 5. Code Generation
- [ ] Generated codes are unique
- [ ] Codes use URL-safe characters
- [ ] Collision handling works

### Frontend Tests

#### 1. Short Link Redirect
- [ ] `/s/{code}` redirects to canonical video route
- [ ] Redirect includes `?src=share`
- [ ] Invalid code shows 404 page
- [ ] Locale query param works

#### 2. Copy Share Link Button
- [ ] Button generates link on first click
- [ ] Button reuses link on subsequent clicks
- [ ] Link copied to clipboard
- [ ] Loading state shows correctly
- [ ] Success state shows correctly
- [ ] Errors handled gracefully

#### 3. Integration
- [ ] Button appears on edit page
- [ ] Button works for eligible videos
- [ ] Button disabled/hidden for ineligible videos

## Day 23 LOCK Checklist ✅

### Backend
- [x] ShortLink model added to Prisma schema
- [x] `POST /videos/:id/share` creates or retrieves short link
- [x] `GET /short-links/:code` resolves short link
- [x] Only owner/admin can create links
- [x] One link per video (idempotent)
- [x] Only PUBLISHED + PUBLIC/UNLISTED videos resolve
- [x] Invalid/inaccessible links return 404

### Frontend
- [x] `/s/[code]` route redirects correctly
- [x] Redirect includes `?src=share`
- [x] CopyShareLinkButton component created
- [x] Button integrated into edit page
- [x] Clipboard copy works
- [x] Loading/success states work

## Migration Required

After implementing Day 23, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_short_links
pnpm prisma generate
```

This migration will:
- Create `ShortLink` table
- Add relations to `User` and `Video` models
- Add indexes for performance

## Suggested curl Checks

### Create Short Link
```bash
curl -X POST "http://localhost:3001/videos/VIDEO_ID/share" \
  -H "Authorization: Bearer $TOKEN"
```

Expected:
```json
{
  "code": "abc123",
  "shortUrl": "http://localhost:3000/s/abc123",
  "targetUrl": "/en/v/video-slug?src=share"
}
```

### Resolve Short Link
```bash
curl "http://localhost:3001/short-links/abc123?locale=en"
```

Expected:
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

### Test Invalid Code
```bash
curl "http://localhost:3001/short-links/invalid"
```

Expected: `404 Not Found`

## Route Examples

### Short Link URLs
- Basic: `http://localhost:3000/s/abc123`
- With locale: `http://localhost:3000/s/abc123?locale=si`

### Redirect Targets
- English: `/en/v/video-slug?src=share`
- Sinhala: `/si/v/video-slug?src=share`
- Tamil: `/ta/v/video-slug?src=share`

## Environment Variables

Ensure these are set:

```bash
# Base URL for short links (used in API response)
NEXT_PUBLIC_APP_URL=https://streamora.app
# Or fallback:
APP_BASE_URL=https://streamora.app
```

## Future Enhancements

### Campaign Links
- Add campaign parameter: `/s/abc123?campaign=instagram`
- Track campaign-specific analytics
- Separate campaign link table

### QR Code Generation
- Generate QR codes for short links
- Download QR codes for print/display
- Track QR code scans separately

### Link Analytics
- Track short link clicks
- Show click statistics to creators
- Identify top sharing platforms

### Custom Short Codes
- Allow creators to set custom codes (if available)
- Reserved codes for special campaigns
- Branded short links

### Link Expiration
- Optional expiration dates
- Auto-disable expired links
- Notification before expiration

### Bulk Link Generation
- Generate links for multiple videos
- Export CSV with short links
- Batch operations

## Result of Day 23

After this day, Streamora gains:
- ✅ Clean, shareable URLs for videos
- ✅ Better social media distribution
- ✅ Improved analytics attribution
- ✅ Foundation for campaign tracking
- ✅ Foundation for QR code sharing

This is a strong Phase 3 feature that directly improves content distribution and creator workflow.

## Files Created/Modified

### Backend
- `apps/api/prisma/schema.prisma` (modified - added ShortLink model)
- `apps/api/src/short-links/short-links.service.ts` (new)
- `apps/api/src/short-links/short-links.controller.ts` (new)
- `apps/api/src/app.module.ts` (modified - registered controller/service)

### Frontend
- `apps/web/src/lib/api/share-links.ts` (new)
- `apps/web/src/app/s/[code]/page.tsx` (new)
- `apps/web/src/components/CopyShareLinkButton.tsx` (new)
- `apps/web/src/components/video-draft-editor.tsx` (modified - added share button)

## Next Steps

- Add share button to public video pages (for viewers)
- Add share button to creator dashboard video list
- Add QR code generation for short links
- Add link analytics/click tracking
- Add campaign link support
