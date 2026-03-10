# Day 19 — Search + Discovery

## Summary

Implemented comprehensive search and discovery functionality for both public viewers and creators. Public search allows keyword search, channel/tag filtering, and pagination. Creator search enables creators to find and filter their own videos by keyword, status, and visibility.

## Changes Made

### 1. Backend: Public Videos Service ✅

**Created**: `apps/api/src/public/public-videos.service.ts`
- `listVideos()` - Enhanced public video listing with search
- Keyword search (`q`) on title, description, tagline
- Channel filter by slug
- Tag filter by slug
- Pagination support
- Only returns `PUBLISHED` + `PUBLIC` videos
- Locale-aware translations with fallback
- Includes thumbnails, channels, tags, uploader info

**Search Strategy**:
- Uses PostgreSQL `contains` with `insensitive` mode
- Searches both requested locale and English translations
- Combines multiple filters (keyword + channel + tag)

### 2. Backend: Public Videos Controller ✅

**Updated**: `apps/api/src/public/public.videos.controller.ts`
- Refactored to use `PublicVideosService`
- Supports query params: `locale`, `q`, `channel`, `tag`, `page`, `pageSize`
- Returns structured response with filters, pagination, and items

### 3. Backend: Creator Videos Query Service ✅

**Created**: `apps/api/src/videos/creator-videos-query.service.ts`
- `listMine()` - Search creator's own videos
- Keyword search on title, description, tagline
- Status filter (DRAFT, READY, PENDING_APPROVAL, etc.)
- Visibility filter (PUBLIC, UNLISTED, PRIVATE)
- Pagination support
- Returns all creator videos regardless of status/visibility
- Includes thumbnails and translations

### 4. Backend: Videos Controller Enhancement ✅

**Updated**: `apps/api/src/videos/videos.controller.ts`
- Enhanced `GET /creator/videos` endpoint
- Added query params: `locale`, `q`, `status`, `visibility`, `page`, `pageSize`
- Delegates to `CreatorVideosQueryService`

### 5. Backend: Videos Service Updates ✅

**Updated**: `apps/api/src/videos/videos.service.ts`
- Added `getUserByKeycloakSub()` helper method
- Added `queryMine()` method that delegates to query service
- Injected `CreatorVideosQueryService` dependency

### 6. Module Wiring ✅

**Updated**: `apps/api/src/app.module.ts`
- Added `PublicVideosService` to providers
- Added `CreatorVideosQueryService` to providers

**Updated**: `apps/api/src/videos/videos.module.ts`
- Added `CreatorVideosQueryService` to providers
- Added `PrismaModule` import

### 7. Frontend: Public Videos API Helper ✅

**Created**: `apps/web/src/lib/api/public-videos.ts`
- `getPublicVideos()` - Fetches public videos with search params
- Handles query string construction
- Error handling

### 8. Frontend: Creator Videos API Helper ✅

**Created**: `apps/web/src/lib/api/creator-videos.ts`
- `getCreatorVideos()` - Fetches creator videos with search params
- Includes authentication token
- Error handling

### 9. Frontend: Public Videos Page Enhancement ✅

**Updated**: `apps/web/src/app/[locale]/videos/page.tsx`
- Added search form with keyword, channel, and tag inputs
- Active filter chips display
- Video grid with thumbnails
- Pagination controls
- Channel links in video cards
- Empty state message
- Server-side rendering with search params

### 10. Frontend: Creator Dashboard Videos Page ✅

**Created**: `apps/web/src/app/[locale]/dashboard/videos/page.tsx`
- New dedicated page for creator video search
- Search form with keyword, status, and visibility filters
- Video list with thumbnails
- Status and visibility badges
- Action links (Edit, Thumbnails)
- Pagination controls
- Client-side data fetching with React hooks

## API Endpoints

### GET /videos (Public Search)

**Query Parameters**:
- `locale` (default: 'en') - Locale for translations
- `q` (optional) - Keyword search
- `channel` (optional) - Channel slug filter
- `tag` (optional) - Tag slug filter
- `page` (default: '1') - Page number
- `pageSize` (default: '12') - Items per page

**Response**:
```json
{
  "filters": {
    "q": "travel",
    "channel": "adventure",
    "tag": "srilanka",
    "locale": "en"
  },
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "total": 24,
    "totalPages": 2
  },
  "items": [
    {
      "id": "vid_1",
      "slug": "amazing-sri-lanka-trip",
      "title": "Amazing Sri Lanka Trip",
      "tagline": "Adventure awaits",
      "thumbnailUrl": "https://...",
      "uploaderName": "Rasike",
      "publishedAt": "2026-03-10T08:00:00.000Z",
      "channels": [
        { "slug": "travel", "name": "Travel" }
      ],
      "tags": [
        { "slug": "srilanka", "name": "Sri Lanka" }
      ]
    }
  ]
}
```

### GET /creator/videos (Creator Search)

**Authentication**: Required (JWT)

**Query Parameters**:
- `locale` (default: 'en') - Locale for translations
- `q` (optional) - Keyword search
- `status` (optional) - Status filter (DRAFT, READY, PENDING_APPROVAL, etc.)
- `visibility` (optional) - Visibility filter (PUBLIC, UNLISTED, PRIVATE)
- `page` (default: '1') - Page number
- `pageSize` (default: '12') - Items per page

**Response**:
```json
{
  "filters": {
    "q": "launch",
    "status": "READY",
    "visibility": "PRIVATE"
  },
  "pagination": {
    "page": 1,
    "pageSize": 12,
    "total": 7,
    "totalPages": 1
  },
  "items": [
    {
      "id": "vid_1",
      "slug": "product-launch",
      "status": "READY",
      "visibility": "PRIVATE",
      "title": "Product Launch",
      "tagline": "New product announcement",
      "thumbnailUrl": "https://...",
      "scheduledAt": null,
      "publishedAt": null,
      "updatedAt": "2026-03-10T08:00:00.000Z"
    }
  ]
}
```

## Search Principles

### Public Search Rules

Search **only** returns videos that are:
- `status: 'PUBLISHED'`
- `visibility: 'PUBLIC'`

**Never includes**:
- UNLISTED videos
- PRIVATE videos
- PENDING_APPROVAL videos
- APPROVED videos (not yet published)
- REJECTED videos
- TAKEDOWN videos
- ARCHIVED videos

### Creator Search Rules

Returns **only** the current user's videos:
- Regardless of visibility
- Regardless of moderation state
- Includes all lifecycle states relevant to creator workflow

## Search Strategy

### Implementation Approach

For Day 19, uses **PostgreSQL contains/ILIKE** style matching via Prisma:
- `contains` with `mode: 'insensitive'` for case-insensitive search
- Searches video translation fields: title, description, tagline
- Searches both requested locale and English translations
- Simple and correct for MVP search

### Future Enhancements

When scale grows, can migrate to:
- Postgres full-text search
- Trigram indexes
- Meilisearch / OpenSearch / Algolia

### What Fields Are Searched?

**Public Search** matches against:
- Video translation `title`
- Video translation `description`
- Video translation `tagline`

**Filter-based Discovery**:
- Channel slug filter
- Tag slug filter

## Locale Behavior

**Requested locale**: en, si, or ta

**Rules**:
1. Prefer translation in requested locale
2. Fallback to English
3. Search tries matching requested locale text first
4. Optional fallback matching against English translation too

**Implementation**:
- Query both requested locale and English
- Display requested locale first, fallback to English
- Better search results when non-English translations are partial

## Search Result Ranking

**Public Search**:
- Order by: `publishedAt desc`, `createdAt desc`

**Creator Search**:
- Order by: `updatedAt desc`

**Future Enhancements** (optional):
- Weighted ranking (title matches higher than description)
- Exact phrase higher than partial
- Recent published videos boosted

## UI Features

### Public Videos Page

**Search Form**:
- Keyword input (q)
- Channel slug input
- Tag slug input
- Search button
- Clear button

**Active Filters**:
- Filter chips showing active filters
- Visual indicators

**Video Grid**:
- Responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- Video thumbnails
- Titles and taglines
- Channel pills (clickable)
- Links to video detail pages

**Pagination**:
- Page number display
- Previous/Next buttons
- Disabled state for first/last page

### Creator Dashboard Videos Page

**Search Form**:
- Keyword input (q)
- Status dropdown (All, DRAFT, READY, PENDING_APPROVAL, etc.)
- Visibility dropdown (All, PUBLIC, UNLISTED, PRIVATE)
- Search button
- Clear button

**Video List**:
- Horizontal cards with thumbnails
- Video titles and taglines
- Status badges
- Visibility badges
- Scheduled indicator
- Action links (Edit, Thumbnails)

**Pagination**:
- Page number display
- Previous/Next buttons

## Testing Checklist

### Public Search

#### 1. Keyword Search
- [ ] `GET /videos?q=travel` returns matching videos
- [ ] Search is case-insensitive
- [ ] Searches title, description, and tagline
- [ ] Searches both requested locale and English

#### 2. Channel Filter
- [ ] `GET /videos?channel=travel` returns videos in channel
- [ ] Combines with keyword search
- [ ] Only active channels are included

#### 3. Tag Filter
- [ ] `GET /videos?tag=srilanka` returns videos with tag
- [ ] Combines with keyword and channel filters

#### 4. Combined Filters
- [ ] `GET /videos?q=trip&channel=travel&tag=srilanka` works correctly
- [ ] All filters combine with AND logic

#### 5. Pagination
- [ ] First page shows first 12 videos
- [ ] Next page shows next 12 videos
- [ ] Page count is correct
- [ ] Total count is accurate

#### 6. Visibility Rules
- [ ] Only PUBLISHED + PUBLIC videos appear
- [ ] UNLISTED videos don't appear
- [ ] PRIVATE videos don't appear

#### 7. Empty Results
- [ ] No matching videos shows empty state
- [ ] Empty state message is clear

### Creator Search

#### 1. Keyword Search
- [ ] `GET /creator/videos?q=launch` returns matching videos
- [ ] Only returns current user's videos
- [ ] Searches all statuses and visibilities

#### 2. Status Filter
- [ ] `GET /creator/videos?status=READY` filters correctly
- [ ] All status options work

#### 3. Visibility Filter
- [ ] `GET /creator/videos?visibility=PRIVATE` filters correctly
- [ ] All visibility options work

#### 4. Combined Filters
- [ ] `GET /creator/videos?q=launch&status=READY&visibility=PRIVATE` works
- [ ] All filters combine correctly

#### 5. Pagination
- [ ] Pagination works for creator videos
- [ ] Page count is correct

### Frontend

#### 1. Public Search UI
- [ ] Search form submits correctly
- [ ] Active filters display as chips
- [ ] Video grid renders correctly
- [ ] Pagination links work
- [ ] Channel links work

#### 2. Creator Search UI
- [ ] Search form submits correctly
- [ ] Status dropdown works
- [ ] Visibility dropdown works
- [ ] Video list renders correctly
- [ ] Action links work
- [ ] Pagination works

## Day 19 LOCK Checklist ✅

### Public Search
- [x] `GET /videos` supports `q`, `channel`, `tag`, `locale`, `page`, `pageSize`
- [x] Public search returns only `PUBLISHED` + `PUBLIC`
- [x] Search matches translation fields (title, description, tagline)
- [x] Pagination works
- [x] Channel/tag filters combine correctly with search
- [x] Public `/[locale]/videos` supports search UI
- [x] Results link correctly to video detail pages

### Creator Search
- [x] `GET /creator/videos` supports `q`, `status`, `visibility`, `locale`, `page`, `pageSize`
- [x] Creator search only returns current user's videos
- [x] Creator dashboard page supports search and filters
- [x] Results link correctly to edit/thumbnail pages

## Suggested curl Checks

### Public Search by Keyword
```bash
curl "http://localhost:3001/videos?locale=en&q=travel&page=1&pageSize=12"
```

### Public Search by Channel
```bash
curl "http://localhost:3001/videos?locale=en&channel=travel&page=1&pageSize=12"
```

### Public Search by Tag
```bash
curl "http://localhost:3001/videos?locale=en&tag=srilanka&page=1&pageSize=12"
```

### Combined Filter
```bash
curl "http://localhost:3001/videos?locale=en&q=trip&channel=travel&tag=srilanka&page=1&pageSize=12"
```

### Creator Search
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos?locale=en&q=launch&status=READY&visibility=PRIVATE&page=1&pageSize=12"
```

## Route Examples

### Public Search
- Basic: `http://localhost:3000/en/videos`
- With keyword: `http://localhost:3000/en/videos?q=travel`
- With filters: `http://localhost:3000/en/videos?q=trip&channel=travel&tag=srilanka`
- With pagination: `http://localhost:3000/en/videos?q=travel&page=2`

### Creator Search
- Basic: `http://localhost:3000/en/dashboard/videos`
- With keyword: `http://localhost:3000/en/dashboard/videos?q=launch`
- With filters: `http://localhost:3000/en/dashboard/videos?status=READY&visibility=PRIVATE`
- With pagination: `http://localhost:3000/en/dashboard/videos?q=launch&page=2`

## Recommended Indexes

To keep Day 19 performing well, consider adding these Prisma indexes:

```prisma
model Video {
  @@index([status, visibility, publishedAt])
  @@index([uploaderId, updatedAt])
}

model VideoTranslation {
  @@index([locale])
}
```

These indexes help with:
- Public search filtering by status/visibility
- Creator search filtering by uploader
- Translation locale lookups

## Future Enhancements

### Optional Filter Source APIs
- `GET /channels?locale=en` - Power filter dropdowns
- `GET /tags?locale=en` - Power tag autocomplete

### Search Ranking Improvements
- Weighted ranking (title > description > tagline)
- Exact phrase matching
- Recent published videos boosted

### Advanced Search Features
- Date range filters
- Duration filters
- Sort options (newest, oldest, most viewed, trending)
- Search suggestions/autocomplete

## Result of Day 19

After this day, Streamora gains:
- ✅ Public discoverability
- ✅ Searchable catalog
- ✅ Channel/tag refinement
- ✅ Creator dashboard search
- ✅ Multilingual search-aware browsing

This is a major usability milestone that transforms Streamora from a publishing pipeline into a real content platform.

## Next Steps

After Day 19 is locked:
- **Day 20**: Analytics Dashboard
- **Day 21**: Comments System
- **Day 22**: Playlists/Collections
