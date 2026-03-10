# Day 11 — Channels/Tags Upload Form Wiring + Public Filters

## Summary

Implemented complete channels/tags integration into the upload flow and public filtering. Admin can create/edit channels and tags with translations. Creators can select channels/tags when creating drafts. Public video listing supports filtering by channel and tag with locale-aware names.

## Changes Made

### 1. Channels API - Admin CRUD ✅

**Updated**: `apps/api/src/channels/channels.controller.ts`
- **GET /channels?locale=en** - Returns channels with locale-aware names (existing, improved)
- **POST /admin/channels** - Create channel with translations (new)
- **PATCH /admin/channels/:id** - Update channel and translations (new)

**Updated**: `apps/api/src/channels/channels.service.ts`
- Improved locale fallback (locale → English → base name)

### 2. Tags API - Admin CRUD ✅

**Updated**: `apps/api/src/tags/tags.controller.ts`
- **GET /tags?locale=en** - Returns tags with locale-aware names (existing, improved)
- **POST /admin/tags** - Create tag with translations (new)
- **PATCH /admin/tags/:id** - Update tag and translations (new)

**Updated**: `apps/api/src/tags/tags.service.ts`
- Improved locale fallback (locale → English → base name)

### 3. Public Videos API - Enhanced Filters ✅

**Updated**: `apps/api/src/public/public.videos.controller.ts`
- **GET /videos?channel=...&tag=...&locale=...** - Enhanced with:
  - Channel and tag filtering (existing)
  - Locale-aware channel/tag names in response (new)
  - Includes full channel/tag data with translations

### 4. Creator Draft Form Component ✅

**Created**: `apps/web/src/components/video-draft-form.tsx`
- Form for creating video drafts
- Channel selection (multi-select buttons)
- Tag selection (multi-select buttons)
- Title, description, tagline, audience fields
- Locale-aware channel/tag names
- Visual feedback for selected items

### 5. Public Video Filters Component ✅

**Created**: `apps/web/src/components/public-video-filters.tsx`
- Filter by channel (buttons)
- Filter by tag (buttons)
- "All" option to clear filters
- Locale-aware channel/tag names
- URL-based filter state (query params)
- Visual feedback for active filters

### 6. Public Videos Listing Page ✅

**Created**: `apps/web/src/app/[locale]/videos/page.tsx`
- Lists published public videos
- Includes filter component
- Shows channel and tag names for each video
- Links to share page (`/[locale]/v/[slug]`)
- Locale-aware

### 7. Dashboard Integration ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Added `VideoDraftForm` component
- Creators can now create drafts with channels/tags

## API Endpoints

### Channels

**GET /channels?locale=en**
- Returns active channels with locale-aware names
- Falls back to English, then base name

**POST /admin/channels** (Admin only)
```json
{
  "name": "Technology",
  "slug": "technology",
  "sortOrder": 1,
  "translations": [
    { "locale": "en", "name": "Technology", "description": "Tech videos" },
    { "locale": "si", "name": "තාක්ෂණය", "description": "තාක්ෂණික වීඩියෝ" },
    { "locale": "ta", "name": "தொழில்நுட்பம்", "description": "தொழில்நுட்ப வீடியோக்கள்" }
  ]
}
```

**PATCH /admin/channels/:id** (Admin only)
- Update channel properties and translations

### Tags

**GET /tags?locale=en**
- Returns tags with locale-aware names
- Falls back to English, then base name
- Sorted by preferred first, then name

**POST /admin/tags** (Admin only)
```json
{
  "name": "AI",
  "slug": "ai",
  "preferred": true,
  "translations": [
    { "locale": "en", "name": "AI" },
    { "locale": "si", "name": "කෘත්‍රිම බුද්ධිය" },
    { "locale": "ta", "name": "செயற்கை நுண்ணறிவு" }
  ]
}
```

**PATCH /admin/tags/:id** (Admin only)
- Update tag properties and translations

### Public Videos

**GET /videos?channel=technology&tag=ai&locale=si**
- Returns published public videos
- Filtered by channel slug and/or tag slug
- Includes locale-aware channel/tag names in response

**Response**:
```json
[
  {
    "id": "clx123",
    "slug": "my-video",
    "title": "My Video",
    "tagline": "Short description",
    "channels": [
      { "slug": "technology", "name": "තාක්ෂණය" }
    ],
    "tags": [
      { "slug": "ai", "name": "කෘත්‍රිම බුද්ධිය" }
    ]
  }
]
```

## Routes

### Public Videos Listing
```
/[locale]/videos?channel=technology&tag=ai
```

**Examples**:
- `/en/videos` - All videos
- `/en/videos?channel=technology` - Technology channel
- `/si/videos?tag=ai` - AI tag in Sinhala
- `/ta/videos?channel=tech&tag=ai` - Combined filters

## Testing

### 1. Test Admin CRUD

**Create Channel**:
```bash
curl -X POST http://localhost:3001/admin/channels \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Technology",
    "slug": "technology",
    "sortOrder": 1,
    "translations": [
      { "locale": "en", "name": "Technology" },
      { "locale": "si", "name": "තාක්ෂණය" }
    ]
  }'
```

**Create Tag**:
```bash
curl -X POST http://localhost:3001/admin/tags \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI",
    "slug": "ai",
    "preferred": true,
    "translations": [
      { "locale": "en", "name": "AI" },
      { "locale": "si", "name": "කෘත්‍රිම බුද්ධිය" }
    ]
  }'
```

### 2. Test Locale-Aware Endpoints

**Channels**:
```bash
# English
curl http://localhost:3001/channels?locale=en

# Sinhala
curl http://localhost:3001/channels?locale=si

# Tamil
curl http://localhost:3001/channels?locale=ta
```

**Tags**:
```bash
# English
curl http://localhost:3001/tags?locale=en

# Sinhala
curl http://localhost:3001/tags?locale=si
```

### 3. Test Draft Form

1. Go to dashboard: `http://localhost:3000/en/dashboard`
2. Fill in draft form:
   - Title, description, tagline
   - Select channels (multi-select)
   - Select tags (multi-select)
3. Click "Save Draft"
4. **Verify**: Draft created with channels/tags

### 4. Test Public Filters

1. Go to videos page: `http://localhost:3000/en/videos`
2. Click channel filter
3. **Verify**: Videos filtered by channel
4. Click tag filter
5. **Verify**: Videos filtered by tag
6. Click "All" to clear filters
7. **Verify**: All videos shown

### 5. Test Locale-Aware Filters

1. Go to: `http://localhost:3000/si/videos`
2. **Verify**: Channel/tag names in Sinhala
3. Go to: `http://localhost:3000/ta/videos`
4. **Verify**: Channel/tag names in Tamil

## Day 11 LOCK Checklist ✅

- [ ] GET /channels?locale=si returns translated names
- [ ] GET /tags?locale=ta returns translated names
- [ ] POST /admin/channels creates channel with translations
- [ ] POST /admin/tags creates tag with translations
- [ ] Creator draft form loads channels/tags
- [ ] Draft create stores VideoChannel + VideoTag relations
- [ ] Public /videos?channel=...&tag=...&locale=... filters correctly
- [ ] Public page shows localized channel/tag names
- [ ] Filter UI updates URL query params
- [ ] Videos listing page displays channel/tag names

## Sample Data

### Create Sample Channels

```bash
# Technology
POST /admin/channels
{
  "name": "Technology",
  "slug": "technology",
  "sortOrder": 1,
  "translations": [
    { "locale": "en", "name": "Technology", "description": "Tech videos" },
    { "locale": "si", "name": "තාක්ෂණය", "description": "තාක්ෂණික වීඩියෝ" },
    { "locale": "ta", "name": "தொழில்நுட்பம்", "description": "தொழில்நுட்ப வீடியோக்கள்" }
  ]
}

# Entertainment
POST /admin/channels
{
  "name": "Entertainment",
  "slug": "entertainment",
  "sortOrder": 2,
  "translations": [
    { "locale": "en", "name": "Entertainment", "description": "Entertainment videos" },
    { "locale": "si", "name": "විනෝදාස්වාදය", "description": "විනෝදාස්වාද වීඩියෝ" },
    { "locale": "ta", "name": "பொழுதுபோக்கு", "description": "பொழுதுபோக்கு வீடியோக்கள்" }
  ]
}
```

### Create Sample Tags

```bash
# AI
POST /admin/tags
{
  "name": "AI",
  "slug": "ai",
  "preferred": true,
  "translations": [
    { "locale": "en", "name": "AI" },
    { "locale": "si", "name": "කෘත්‍රිම බුද්ධිය" },
    { "locale": "ta", "name": "செயற்கை நுண்ணறிவு" }
  ]
}

# Tutorial
POST /admin/tags
{
  "name": "Tutorial",
  "slug": "tutorial",
  "preferred": true,
  "translations": [
    { "locale": "en", "name": "Tutorial" },
    { "locale": "si", "name": "උපදෙස්" },
    { "locale": "ta", "name": "பயிற்சி" }
  ]
}
```

## Next Steps

After Day 11 is locked:
- **Day 12**: Stabilization (quotas, retries, logs)
- **Day 13**: Proper Drafts + Metadata Editor (enhancements)
- **Day 14**: Bulk Upload Manager

## Notes

- Channels and tags are already supported in the videos service (Day 3)
- The draft form component is separate from the existing dashboard form
- Public filters use URL query params for state management
- Locale fallback: requested locale → English → base name
- Admin endpoints require ADMIN role
