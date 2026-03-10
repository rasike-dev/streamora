# Day 16 — Video Visibility Modes

## Summary

Implemented comprehensive video visibility control (PUBLIC, UNLISTED, PRIVATE) that works with the existing moderation lifecycle. Creators can control discoverability while moderation controls publication eligibility.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`
- Renamed `Visibility` enum to `VideoVisibility` (for clarity)
- Updated `Video` model to use `VideoVisibility` enum
- Default visibility: `PRIVATE`

**Note**: If `Visibility` enum already existed, it's been renamed to `VideoVisibility` for consistency.

### 2. Backend: Visibility DTO ✅

**Created**: `apps/api/src/videos/dto/update-video-visibility.dto.ts`
- `VideoVisibilityDto` enum (PUBLIC, UNLISTED, PRIVATE)
- `UpdateVideoVisibilityDto` class with validation

### 3. Backend: Visibility Service ✅

**Created**: `apps/api/src/videos/video-visibility.service.ts`
- `updateVisibility()` - Updates video visibility
- Validates video ownership
- Validates editable statuses
- Returns updated video info

**Editable Statuses**:
- DRAFT
- READY
- REJECTED
- PENDING_APPROVAL
- APPROVED
- PUBLISHED

### 4. Backend: Visibility Controller ✅

**Created**: `apps/api/src/videos/video-visibility.controller.ts`
- `PATCH /creator/videos/:id/visibility` - Update visibility
- JWT authentication required
- Uses `UpdateVideoVisibilityDto` for validation

### 5. Public Endpoints Updates ✅

**Updated**: `apps/api/src/public/public.videos.controller.ts`
- List endpoint only returns: `status: 'PUBLISHED'` AND `visibility: 'PUBLIC'`
- UNLISTED and PRIVATE videos excluded from listings

**Updated**: `apps/api/src/public/public.video-share.controller.ts`
- Allows: `status: 'PUBLISHED'` AND (`visibility: 'PUBLIC'` OR `visibility: 'UNLISTED'`)
- Rejects: PRIVATE videos

**Updated**: `apps/api/src/public/public.video-by-slug.controller.ts`
- Same rules as share controller
- UNLISTED videos accessible by direct URL

### 6. Frontend: API Helper ✅

**Created**: `apps/web/src/lib/api/video-visibility.ts`
- `updateVideoVisibility()` - Updates visibility via API
- Uses existing `apiFetch` helper

### 7. Frontend: Visibility Selector Component ✅

**Created**: `apps/web/src/components/videos/VideoVisibilitySelector.tsx`
- Radio button group for visibility selection
- Three options: Public, Unlisted, Private
- Descriptions for each option
- Loading and error states
- Auto-updates on selection

### 8. Draft Editor Integration ✅

**Updated**: `apps/web/src/components/video-draft-editor.tsx`
- Added `VideoVisibilitySelector` component
- Shows visibility selector when video is editable
- Reloads video data after visibility update
- Added `visibility` to `VideoDraft` type

### 9. Dashboard Integration ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Shows visibility badge in video list
- Format: "Status: {status} | Visibility: {visibility} | Slug: {slug}"

### 10. App Module Registration ✅

**Updated**: `apps/api/src/app.module.ts`
- Registered `CreatorVideoVisibilityController`
- Registered `CreatorVideoVisibilityService` as provider

## Visibility Rules Matrix

| Status | Visibility | Public Listing | Direct Public URL |
|--------|-----------|----------------|-------------------|
| DRAFT / READY / APPROVED / etc. | any | ❌ No | ❌ No |
| PUBLISHED | PUBLIC | ✅ Yes | ✅ Yes |
| PUBLISHED | UNLISTED | ❌ No | ✅ Yes |
| PUBLISHED | PRIVATE | ❌ No | ❌ No |
| TAKEDOWN | any | ❌ No | ❌ No |
| ARCHIVED | any | ❌ No | ❌ No |

## API Endpoints

### PATCH /creator/videos/:id/visibility

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "visibility": "UNLISTED"
}
```

**Response**:
```json
{
  "success": true,
  "videoId": "vid_123",
  "status": "PUBLISHED",
  "visibility": "UNLISTED"
}
```

**Errors**:
- `404 Not Found`: Video not found or not owned by user
- `400 Bad Request`: Video visibility not editable in current status

### Public Endpoints Behavior

**GET /videos** (Public Listing):
- Returns only: `status: 'PUBLISHED'` AND `visibility: 'PUBLIC'`
- Excludes UNLISTED and PRIVATE

**GET /public/videos/:slug** (Direct Access):
- Allows: `status: 'PUBLISHED'` AND (`visibility: 'PUBLIC'` OR `visibility: 'UNLISTED'`)
- Rejects: PRIVATE videos

**GET /videos/by-slug/:slug** (Public by Slug):
- Same rules as share endpoint

## Visibility Semantics

### PUBLIC
- ✅ Visible on public listing pages
- ✅ Visible on channel/tag discovery pages
- ✅ Accessible by direct URL
- ✅ Shareable
- ✅ Appears in search (future)

### UNLISTED
- ❌ Not shown in public listings/search/discovery
- ✅ Accessible by direct URL
- ✅ Shareable if someone has the link
- ✅ Hidden from channel/tag pages

### PRIVATE
- ❌ Not shown publicly anywhere
- ❌ Not accessible by anonymous users
- ✅ Only visible to owner/admin in dashboard
- ✅ Not accessible via public slug endpoint

## Moderation Interaction

**Key Rule**: Visibility does not bypass moderation.

**Example Flow**:
1. Creator sets `visibility: 'PUBLIC'`
2. Video status: `READY`
3. Video is **not** publicly accessible yet
4. Admin publishes (status → `PUBLISHED`)
5. Now video becomes publicly listed (because `PUBLISHED` + `PUBLIC`)

**Admin Publish Behavior**:
- Admin publish does **not** override visibility
- Visibility remains creator-selected
- This allows creators to control discoverability even after approval

## UI Features

### Visibility Selector
- Radio button group
- Three options with descriptions:
  - **Public**: "Anyone can watch. Appears in listings and discovery."
  - **Unlisted**: "Anyone with the link can watch. Hidden from listings and search."
  - **Private**: "Only you and admins can access it."
- Visual feedback (selected state highlighted)
- Auto-saves on selection

### Dashboard Display
- Shows visibility in video list
- Format: "Status: {status} | Visibility: {visibility} | Slug: {slug}"

## Testing Checklist

### 1. Update Visibility
- [ ] PATCH /creator/videos/:id/visibility with PUBLIC
- [ ] PATCH /creator/videos/:id/visibility with UNLISTED
- [ ] PATCH /creator/videos/:id/visibility with PRIVATE
- [ ] Verify response includes updated visibility

### 2. Public Listing
- [ ] GET /videos returns only PUBLISHED + PUBLIC
- [ ] UNLISTED videos not in listing
- [ ] PRIVATE videos not in listing
- [ ] Non-PUBLISHED videos not in listing

### 3. Direct Access
- [ ] GET /public/videos/:slug works for PUBLISHED + PUBLIC
- [ ] GET /public/videos/:slug works for PUBLISHED + UNLISTED
- [ ] GET /public/videos/:slug returns 404 for PRIVATE
- [ ] GET /public/videos/:slug returns 404 for non-PUBLISHED

### 4. Channel/Tag Discovery
- [ ] Channel pages only show PUBLISHED + PUBLIC
- [ ] Tag pages only show PUBLISHED + PUBLIC
- [ ] UNLISTED videos not in channel/tag listings

### 5. UI Flow
- [ ] Visibility selector appears in draft editor
- [ ] Selection updates immediately
- [ ] Dashboard shows visibility badge
- [ ] Visibility persists after page refresh

### 6. Moderation Integration
- [ ] Creator can set PUBLIC before approval
- [ ] Video not accessible until PUBLISHED
- [ ] After publish, visibility rules apply
- [ ] Admin publish does not change visibility

## Day 16 LOCK Checklist ✅

- [x] VideoVisibility enum exists in Prisma
- [x] Video model has visibility field
- [x] Creator can update visibility (PATCH endpoint)
- [x] Public listing includes only PUBLISHED + PUBLIC
- [x] Public slug route includes PUBLISHED + PUBLIC/UNLISTED
- [x] Private videos never appear publicly
- [x] Admin publish does not override visibility
- [x] Visibility selector UI component created
- [x] Draft editor integration complete
- [x] Dashboard shows visibility

## Migration Required

After implementing Day 16, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_video_visibility
pnpm prisma generate
```

**Note**: If `Visibility` enum already existed, the migration will rename it to `VideoVisibility` and update all references.

## Notes

- **Moderation First**: Visibility does not bypass moderation. A video must be PUBLISHED before visibility rules apply.
- **Admin Publish**: Admin publish does not override creator-selected visibility. This gives creators control over discoverability.
- **Unlisted Use Case**: UNLISTED is useful for sharing with specific audiences without public discovery.
- **Private Use Case**: PRIVATE is useful for drafts that need to stay hidden even after approval.

## Future Enhancements

- **Slug Hardening**: Add `shareToken` for unlisted videos (optional)
- **Owner Preview**: Creator-authenticated preview route for private videos
- **Search Integration**: Apply visibility rules to search index (Day 19)
- **Analytics**: Track views by visibility mode

## Next Steps

After Day 16 is locked:
- **Day 17**: Scheduled Publishing
- **Day 18**: Comments System
- **Day 19**: Search & Discovery
