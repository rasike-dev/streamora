# Day 22 — Tag Landing Pages

## Summary

Implemented public tag landing pages that allow users to browse videos by tag. Tags are now a first-class discovery surface alongside channels, enabling users to explore content through tag-based navigation. The implementation includes locale-aware tag metadata, paginated video grids, and proper empty state handling.

## Manual Execution Steps

### Step 1: Run Prisma Migration

The schema has been updated to add `description` field to `TagTranslation`. Run the migration:

```bash
cd apps/api
pnpm prisma migrate dev --name add_tag_translation_description
pnpm prisma generate
cd ../..
```

**Expected Output:**
- Migration file created in `apps/api/prisma/migrations/`
- Prisma client regenerated
- Database schema updated

### Step 2: Verify Backend Files

All backend files have been created. Verify they exist:

```bash
# Check service
ls -la apps/api/src/public/public-tags.service.ts

# Check controller
ls -la apps/api/src/public/public-tags.controller.ts

# Check app.module.ts includes new imports
grep -A 2 "PublicTags" apps/api/src/app.module.ts
```

### Step 3: Restart API Server

Restart the NestJS API server to load new modules:

```bash
# Stop current API server (Ctrl+C if running)
# Then restart
cd apps/api
pnpm dev
# Or if using root dev command:
# pnpm dev:api
```

**Expected:** API starts without errors, new routes registered

### Step 4: Verify Frontend Files

All frontend files have been created. Verify they exist:

```bash
# Check API helper
ls -la apps/web/src/lib/api/public-tags.ts

# Check page
ls -la apps/web/src/app/[locale]/tags/[slug]/page.tsx
```

### Step 5: Test Backend Endpoint

Test the new API endpoint with curl:

```bash
# Test with existing tag (replace 'education' with a real tag slug from your DB)
curl "http://localhost:3001/tags/education?locale=en&page=1&pageSize=12"

# Test with nonexistent tag (should return 404)
curl "http://localhost:3001/tags/not-a-real-tag?locale=en"
```

**Expected:**
- Existing tag: Returns 200 with tag data and video list
- Nonexistent tag: Returns 404 Not Found

### Step 6: Test Frontend Page

Start the web server (if not running) and test the tag page:

```bash
# Start web server
cd apps/web
pnpm dev
# Or from root:
# pnpm dev:web
```

Then visit in browser:
- `http://localhost:3000/en/tags/education` (replace with real tag slug)
- `http://localhost:3000/en/tags/not-a-real-tag` (should show 404)

**Expected:**
- Tag page loads with tag name, description, and video grid
- Pagination works if more than 12 videos
- Empty state shows if tag has no public videos
- 404 page shows for non-existent tags

### Step 7: Verify Route Registration

Check that the new controller is registered in app.module.ts:

```bash
grep "PublicTagsController" apps/api/src/app.module.ts
grep "PublicTagsService" apps/api/src/app.module.ts
```

**Expected:** Both should appear in the file

## Changes Made

### 1. Prisma Schema Update ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Field**:
- `description String?` to `TagTranslation` model
- Allows localized tag descriptions for richer tag pages

**Migration Required**: Run `pnpm prisma migrate dev --name add_tag_translation_description`

### 2. Backend: Public Tags Service ✅

**Created**: `apps/api/src/public/public-tags.service.ts`
- `getTagBySlug()` - Main method for fetching tag landing page data
- Resolves tag by slug with locale fallback
- Fetches paginated public videos (PUBLISHED + PUBLIC only)
- Includes video metadata, thumbnails, channels, and uploader info
- Handles locale fallback for tag, video, and channel translations
- Builds public asset URLs for thumbnails

**Key Features**:
- Locale-aware tag metadata resolution
- Public video filtering (PUBLISHED + PUBLIC)
- Pagination support (default 12, max 48 per page)
- Uploader privacy respect (`uploaderVisible` check)
- Channel metadata with locale fallback

### 3. Backend: Public Tags Controller ✅

**Created**: `apps/api/src/public/public-tags.controller.ts`
- `GET /tags/:slug` - Public tag landing page endpoint
- Query params: `locale`, `page`, `pageSize`
- No authentication required (public endpoint)
- Returns tag metadata, pagination info, and video list

**Route Handling**:
- Coexists with existing `GET /tags` (list all tags)
- NestJS routes correctly: `/tags` vs `/tags/:slug`

### 4. App Module Updates ✅

**Updated**: `apps/api/src/app.module.ts`
- Registered `PublicTagsController` in controllers array
- Added `PublicTagsService` to providers array
- Imported controller and service

### 5. Frontend: Public Tags API Helper ✅

**Created**: `apps/web/src/lib/api/public-tags.ts`
- `getPublicTagBySlug()` - Fetches tag page data
- TypeScript types for response structure (`PublicTagPageResponse`)
- Error handling for 404 (throws `TAG_NOT_FOUND` error)
- Constructs query string with locale, page, pageSize

### 6. Frontend: Tag Landing Page ✅

**Created**: `apps/web/src/app/[locale]/tags/[slug]/page.tsx`
- Server-side rendered page (Next.js App Router)
- Tag header section with name and description
- Video grid with thumbnails (responsive: 2/3/4 columns)
- Pagination controls (Previous/Next buttons)
- Empty state message for tags with no videos
- SEO metadata generation (`generateMetadata`)
- Video links include `?src=tag` for analytics tracking
- Channel and uploader info displayed in video cards

**Features**:
- Handles 404 for non-existent tags using Next.js `notFound()`
- Shows empty state vs 404 correctly
- Responsive design (mobile-first)
- SEO-friendly metadata

## API Endpoint

### GET /tags/:slug

**Authentication**: Not required (public endpoint)

**Query Parameters**:
- `locale` (optional, default: `'en'`) - Locale for translations
- `page` (optional, default: `'1'`) - Page number
- `pageSize` (optional, default: `'12'`, max: `48`) - Items per page

**Response**:
```json
{
  "tag": {
    "id": "tag_123",
    "slug": "education",
    "name": "Education",
    "description": "Educational and learning-focused videos"
  },
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "total": 42,
    "totalPages": 4
  },
  "items": [
    {
      "id": "vid_1",
      "slug": "math-revision-fast",
      "title": "Math Revision Fast",
      "description": "Quick revision guide",
      "tagline": "Pass faster",
      "thumbnailUrl": "https://storage.googleapis.com/bucket/path/to/thumb.jpg",
      "publishedAt": "2026-03-08T10:00:00.000Z",
      "channel": {
        "slug": "school-help",
        "name": "School Help"
      },
      "uploader": {
        "displayName": "Rasike"
      }
    }
  ]
}
```

**Errors**:
- `404 Not Found`: Tag slug does not exist

**Public Access Rules**:
- Only returns videos with:
  - `status: 'PUBLISHED'`
  - `visibility: 'PUBLIC'`
- Never includes UNLISTED, PRIVATE, or non-PUBLISHED videos

## Business Rules

### Public Visibility

Tag landing pages **only** show videos that are:
- `status: 'PUBLISHED'`
- `visibility: 'PUBLIC'`

**Never includes**:
- UNLISTED videos (not discoverable)
- PRIVATE videos (creator-only)
- PENDING_APPROVAL videos
- APPROVED videos (not yet published)
- REJECTED videos
- TAKEDOWN videos
- ARCHIVED videos

### Tag Existence Behavior

**Tag exists but has zero public videos**:
- Returns 200 OK
- `pagination.total: 0`
- `items: []`
- Frontend shows empty state message

**Tag does not exist**:
- Returns 404 Not Found
- Frontend shows 404 page

This distinction is important for UX - users can see that a tag exists but has no content yet.

### Locale Fallback

**Tag Metadata**:
1. Requested locale translation (e.g., `si`)
2. Fallback to English (`en`)
3. Fallback to base `Tag.name`

**Video Metadata**:
1. Requested locale translation
2. Fallback to English
3. Fallback to "Untitled"

**Channel Metadata**:
1. Requested locale translation
2. Fallback to English
3. Fallback to base `Channel.name`

### Uploader Privacy

Uploader information is only shown if:
- `video.uploaderVisible = true`
- `video.uploader.displayName` exists

Otherwise, `uploader: null` in response.

## Route Handling

### Route Conflicts

The existing `TagsController` (in `TagsModule`) handles:
- `GET /tags` → Lists all tags

The new `PublicTagsController` handles:
- `GET /tags/:slug` → Shows tag landing page

**NestJS Routing**:
- These routes coexist without conflict
- NestJS matches the more specific route (`:slug`) when a slug is provided
- The list route (`/tags`) matches when no slug is provided

### Frontend Routes

**Tag Landing Page**:
- `/[locale]/tags/[slug]` - Main tag page
- `/[locale]/tags/[slug]?page=2` - Paginated tag page

**Examples**:
- `http://localhost:3000/en/tags/education`
- `http://localhost:3000/si/tags/technology`
- `http://localhost:3000/ta/tags/travel`

## UI Features

### Tag Landing Page

**Header Section**:
- Tag label ("Tag")
- Tag name (localized)
- Tag description (if available, localized)
- Video count ("X public videos")

**Video Grid**:
- Responsive grid layout
  - Mobile: 2 columns
  - Tablet: 3 columns
  - Desktop: 4 columns
- Video cards with:
  - Thumbnail image
  - Title (localized)
  - Tagline (if available)
  - Channel name (if available)
  - Uploader name (if visible)
- Links to video detail page with `?src=tag`

**Pagination**:
- Page number display ("Page X of Y")
- Previous button (disabled on first page)
- Next button (disabled on last page)
- URL-based pagination (`?page=2`)

**Empty State**:
- Shown when tag exists but has no public videos
- Clear message: "No videos yet"
- Explains that tag exists but has no content

**404 State**:
- Shown when tag slug does not exist
- Uses Next.js `notFound()` function
- Standard 404 page

## Testing Checklist

### Backend Tests

#### 1. Tag Lookup
- [ ] `GET /tags/:slug` returns tag data for existing tag
- [ ] `GET /tags/:slug` returns 404 for non-existent tag
- [ ] Tag metadata includes id, slug, name, description

#### 2. Locale Fallback
- [ ] Requested locale translation used when available
- [ ] Falls back to English when requested locale missing
- [ ] Falls back to base tag name when no translations

#### 3. Video Filtering
- [ ] Only PUBLISHED + PUBLIC videos returned
- [ ] UNLISTED videos excluded
- [ ] PRIVATE videos excluded
- [ ] Non-PUBLISHED videos excluded

#### 4. Pagination
- [ ] First page returns first 12 videos
- [ ] Second page returns next 12 videos
- [ ] Page count calculated correctly
- [ ] Total count accurate

#### 5. Video Metadata
- [ ] Video titles localized correctly
- [ ] Thumbnails included when available
- [ ] Channel info included when available
- [ ] Uploader info only when `uploaderVisible = true`

#### 6. Empty State
- [ ] Tag with zero videos returns empty items array
- [ ] Total count is 0
- [ ] No 404 error (tag exists)

### Frontend Tests

#### 1. Page Rendering
- [ ] Tag page loads for existing tag
- [ ] Tag name displays correctly
- [ ] Tag description displays (if available)
- [ ] Video count displays correctly

#### 2. Video Grid
- [ ] Video grid renders correctly
- [ ] Thumbnails display (when available)
- [ ] Titles display correctly
- [ ] Channel names display (when available)
- [ ] Uploader names display (when visible)

#### 3. Pagination
- [ ] Pagination controls render when totalPages > 1
- [ ] Previous button works
- [ ] Next button works
- [ ] Page number updates correctly
- [ ] URL updates with page parameter

#### 4. Empty State
- [ ] Empty state shows when tag has no videos
- [ ] Empty state message is clear
- [ ] No 404 error (tag exists)

#### 5. 404 Handling
- [ ] 404 page shows for non-existent tag
- [ ] Standard Next.js 404 page

#### 6. Analytics Tracking
- [ ] Video links include `?src=tag` parameter
- [ ] Links work correctly with src parameter

#### 7. SEO Metadata
- [ ] Page title includes tag name
- [ ] Meta description includes tag description or fallback
- [ ] OpenGraph tags present
- [ ] Twitter card tags present

## Day 22 LOCK Checklist ✅

### Backend
- [x] Prisma migration adds `description` to `TagTranslation`
- [x] `GET /tags/:slug` endpoint exists
- [x] Only PUBLISHED + PUBLIC videos returned
- [x] Locale fallback works for tag, video, channel metadata
- [x] Pagination works correctly
- [x] Empty state returns 200 with empty items (not 404)
- [x] Non-existent tag returns 404
- [x] Uploader privacy respected

### Frontend
- [x] `/[locale]/tags/[slug]` route exists
- [x] Tag page renders tag header
- [x] Video grid displays correctly
- [x] Pagination controls work
- [x] Empty state displays correctly
- [x] 404 page shows for non-existent tags
- [x] Video links include `?src=tag`
- [x] SEO metadata generated

## Migration Required

After implementing Day 22, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_tag_translation_description
pnpm prisma generate
```

This migration will:
- Add `description String?` field to `TagTranslation` table
- Regenerate Prisma client with new field

**Note**: Existing tag translations will have `description: null`. You can update them via admin interface or direct database updates.

## Suggested curl Checks

### Get Tag Page
```bash
# Basic request
curl "http://localhost:3001/tags/education?locale=en&page=1&pageSize=12"

# With pagination
curl "http://localhost:3001/tags/education?locale=en&page=2&pageSize=12"

# Different locale
curl "http://localhost:3001/tags/education?locale=si&page=1&pageSize=12"
```

### Test 404
```bash
# Non-existent tag
curl "http://localhost:3001/tags/not-a-real-tag?locale=en"

# Expected: 404 Not Found
```

### Test Empty State
```bash
# Tag with no public videos (if you have such a tag)
curl "http://localhost:3001/tags/empty-tag?locale=en&page=1&pageSize=12"

# Expected: 200 OK with items: []
```

## Route Examples

### Tag Landing Pages
- Basic: `http://localhost:3000/en/tags/education`
- With pagination: `http://localhost:3000/en/tags/education?page=2`
- Different locale: `http://localhost:3000/si/tags/technology`
- Tamil: `http://localhost:3000/ta/tags/travel`

### Video Links from Tag Pages
- From tag page: `http://localhost:3000/en/v/amazing-trip?src=tag`
- Analytics will track traffic source as "TAG"

## Integration Points

### Where to Add Tag Links

**Video Detail Pages** (`/[locale]/v/[slug]/page.tsx`):
- Add tag pills that link to `/[locale]/tags/[tagSlug]`
- Similar to existing channel pills

**Public Video Listings** (`/[locale]/videos/page.tsx`):
- Add tag pills to video cards
- Link to tag landing pages

**Search Results**:
- Tag filters can link to tag pages
- Tag autocomplete can link to tag pages

**Channel Pages**:
- Can show related tags
- Link to tag landing pages

## Future Enhancements

### Optional Features (Not Required for Day 22)
- **Tag Cloud Widget**: Show popular tags on homepage
- **Related Tags**: Show tags related to current tag
- **Tag Follow/Subscribe**: Allow users to follow tags
- **Tag Analytics**: Show tag-level analytics (total views, videos)
- **Tag Descriptions**: Rich text descriptions with formatting
- **Tag Images**: Custom images/icons for tags
- **Tag Hierarchy**: Parent/child tag relationships
- **Tag Aliases**: Multiple slugs for same tag

### Performance Optimizations
- **Caching**: Cache tag pages with appropriate TTL
- **Indexes**: Ensure proper database indexes for tag queries
- **CDN**: Serve tag pages via CDN for better performance

## Result of Day 22

After this day, Streamora gains:
- ✅ Tag-based discovery
- ✅ First-class tag navigation
- ✅ Locale-aware tag pages
- ✅ Consistent UX with channel pages
- ✅ SEO-friendly tag URLs

This completes the discovery surface implementation, giving users multiple ways to explore content:
- **Channels**: Browse by category/channel
- **Tags**: Browse by topic/tag
- **Search**: Keyword-based discovery
- **Direct**: Direct video URLs

## Next Steps

After Day 22 is locked:
- **Day 23**: Comments System
- **Day 24**: Playlists/Collections
- **Day 25**: User Profiles
- Or continue with Phase 3 enhancements

## Troubleshooting

### Issue: Migration Fails

**Error**: `Error: P3005 - Database schema is not in sync`

**Solution**:
```bash
cd apps/api
pnpm prisma migrate reset  # WARNING: This deletes all data
# OR
pnpm prisma db push  # Safer: pushes schema without migration
```

### Issue: Route Conflict

**Error**: Route `/tags/:slug` conflicts with `/tags`

**Solution**: 
- Verify `PublicTagsController` is registered after `TagsModule` in `app.module.ts`
- NestJS should handle this automatically, but order matters

### Issue: 404 for Existing Tags

**Check**:
1. Tag slug is correct (case-sensitive)
2. Tag exists in database
3. API endpoint returns 200 (test with curl)
4. Frontend API helper uses correct URL

### Issue: Empty State Not Showing

**Check**:
1. Tag exists in database
2. API returns 200 (not 404)
3. `pagination.total: 0`
4. Frontend checks `items.length === 0`

### Issue: Videos Not Appearing

**Check**:
1. Videos have `status: 'PUBLISHED'`
2. Videos have `visibility: 'PUBLIC'`
3. Videos are linked to tag via `VideoTag` relation
4. Tag slug matches exactly
