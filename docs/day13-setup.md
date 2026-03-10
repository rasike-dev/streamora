# Day 13 — Draft Editor (Full Metadata Editing)

## Summary

Implemented a comprehensive draft editor that allows creators to edit all video metadata including translations (EN/SI/TA), channels, tags, title, description, tagline, and audience. Videos can only be edited in certain statuses, and creators can submit videos for moderation when ready.

## Changes Made

### 1. DTO for Draft Updates ✅

**Created**: `apps/api/src/videos/dto/update-video-draft.dto.ts`
- `VideoTranslationInput` - Translation data per locale
- `UpdateVideoDraftDto` - Full draft update payload with translations, channels, tags

### 2. Videos Service - New Methods ✅

**Updated**: `apps/api/src/videos/videos.service.ts`

**Added Methods**:

**`getDraft(videoId, keycloakSub)`**
- Fetches video draft with all metadata
- Includes translations, channels, tags
- Verifies ownership

**`updateDraftFull(videoId, keycloakSub, data)`**
- Updates translations (upsert per locale)
- Updates channels (by slug, replaces all)
- Updates tags (by slug, replaces all)
- Validates video is editable (status check)
- Uses transaction for atomicity

**`submitForModeration(videoId, keycloakSub)`**
- Transitions video from `READY` → `PENDING_APPROVAL`
- Verifies ownership
- Only allows submission from `READY` status

### 3. Videos Controller - New Endpoints ✅

**Updated**: `apps/api/src/videos/videos.controller.ts`

**Added Endpoints**:

- **GET /creator/videos/:id** - Fetch draft metadata
- **PATCH /creator/videos/:id** - Update draft (supports both old and new format)
- **POST /creator/videos/:id/submit** - Submit for moderation

**Backward Compatibility**: The `PATCH` endpoint supports both:
- Old format: Single locale update (existing functionality)
- New format: Multiple translations, channels, tags (Day 13)

### 4. Draft Editor Component ✅

**Created**: `apps/web/src/components/video-draft-editor.tsx`
- Multi-locale editor with tabs (EN/SI/TA)
- Fields: Title, Description, Tagline, Audience
- Channel multi-select (by slug)
- Tag multi-select (by slug)
- Save draft button
- Submit for approval button (only when READY)
- Status-aware editing (disabled when not editable)
- Visual feedback for saved state

### 5. Edit Page Route ✅

**Created**: `apps/web/src/app/[locale]/dashboard/videos/[id]/edit/page.tsx`
- Route: `/[locale]/dashboard/videos/[id]/edit`
- Integrates `VideoDraftEditor` component
- Back link to dashboard

### 6. Dashboard Integration ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Added "Edit" link for editable videos
- Shows edit link when status is: DRAFT, UPLOADED, PROCESSING_FAILED, READY, REJECTED

## Editable Statuses

Videos can be edited when status is:
- ✅ **DRAFT**
- ✅ **UPLOADED**
- ✅ **PROCESSING_FAILED**
- ✅ **READY**
- ✅ **REJECTED**

Videos cannot be edited when status is:
- ❌ **PENDING_APPROVAL**
- ❌ **APPROVED**
- ❌ **PUBLISHED**
- ❌ **ARCHIVED**

## API Endpoints

### GET /creator/videos/:id

**Authentication**: Required (JWT)

**Response**:
```json
{
  "id": "clx123",
  "status": "READY",
  "translations": [
    {
      "locale": "en",
      "title": "My Video",
      "description": "Description",
      "tagline": "Tagline",
      "audience": "GENERAL"
    }
  ],
  "channels": [
    { "channel": { "slug": "travel", "name": "Travel" } }
  ],
  "tags": [
    { "tag": { "slug": "vlog", "name": "Vlog" } }
  ]
}
```

### PATCH /creator/videos/:id

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "translations": [
    {
      "locale": "en",
      "title": "Amazing Travel Video",
      "description": "Journey through Sri Lanka",
      "tagline": "Adventure awaits",
      "audience": "GENERAL"
    },
    {
      "locale": "si",
      "title": "ශ්‍රී ලංකා සංචාරය",
      "description": "අපූරු ගමනක්",
      "tagline": "සංචාරය"
    }
  ],
  "channels": ["travel", "nature"],
  "tags": ["srilanka", "vlog"]
}
```

**Response**: Updated video object

**Errors**:
- `404 Not Found`: Video not found or not owned by user
- `400 Bad Request`: Video not editable in current status

### POST /creator/videos/:id/submit

**Authentication**: Required (JWT)

**Response**:
```json
{
  "success": true,
  "videoId": "clx123",
  "status": "PENDING_APPROVAL"
}
```

**Errors**:
- `404 Not Found`: Video not found or not owned by user
- `400 Bad Request`: Video must be READY to submit

## Routes

### Edit Page
```
/[locale]/dashboard/videos/[id]/edit
```

**Example**: `/en/dashboard/videos/clx123/edit`

## UI Features

### Language Tabs
- Switch between EN, SI, TA translations
- Active tab highlighted
- Each locale has independent fields

### Form Fields
- **Title**: Single line input
- **Description**: Multi-line textarea
- **Tagline**: Single line input
- **Audience**: Single line input (e.g., "GENERAL", "KIDS", "18+")

### Channel Selection
- Multi-select buttons
- Selected channels highlighted
- Uses channel slugs

### Tag Selection
- Multi-select buttons
- Selected tags highlighted
- Uses tag slugs

### Actions
- **Save Draft**: Saves all changes
- **Submit for Approval**: Only visible when status is READY

## Testing

### 1. Test Draft Fetch

1. Create a draft video
2. Visit: `/en/dashboard/videos/{videoId}/edit`
3. **Verify**: All metadata loads correctly
4. **Verify**: Translations, channels, tags are displayed

### 2. Test Draft Update

1. Edit title, description, tagline in EN locale
2. Switch to SI tab, add Sinhala translation
3. Select channels and tags
4. Click "Save Draft"
5. **Verify**: Success message appears
6. Reload page
7. **Verify**: Changes persisted

### 3. Test Status Restrictions

1. Edit a video in DRAFT status (should work)
2. Admin approves video (status → APPROVED)
3. Try to edit again
4. **Verify**: Form is disabled, shows "not editable" message

### 4. Test Submit for Moderation

1. Edit a video in READY status
2. Click "Submit for Approval"
3. Confirm submission
4. **Verify**: Status changes to PENDING_APPROVAL
5. **Verify**: Video no longer editable

### 5. Test Multi-Locale Editing

1. Edit video in EN locale
2. Switch to SI tab
3. Add Sinhala translation
4. Switch to TA tab
5. Add Tamil translation
6. Save
7. **Verify**: All three translations saved

## Day 13 LOCK Checklist ✅

- [ ] GET /creator/videos/:id returns full metadata
- [ ] PATCH /creator/videos/:id updates translations
- [ ] PATCH /creator/videos/:id updates channels (by slug)
- [ ] PATCH /creator/videos/:id updates tags (by slug)
- [ ] POST /creator/videos/:id/submit transitions READY → PENDING_APPROVAL
- [ ] Edit page loads and displays metadata
- [ ] Language tabs switch correctly
- [ ] Save draft persists changes
- [ ] Submit button only shows when READY
- [ ] Form disabled when video not editable
- [ ] Backward compatibility maintained (old PATCH format still works)

## Notes

- **Backward Compatibility**: The `PATCH /creator/videos/:id` endpoint supports both old format (single locale) and new format (multiple translations)
- **Channel/Tag Lookup**: Uses slugs for channels and tags (more user-friendly than IDs)
- **Transaction Safety**: All updates happen in a transaction for atomicity
- **Status Validation**: Editable statuses are enforced server-side
- **Ownership Check**: All endpoints verify video ownership

## Next Steps

After Day 13 is locked:
- **Day 14**: Bulk Upload Manager
- **Day 15**: Thumbnail Picker + Custom Thumbnail Upload
- **Day 16**: Visibility Modes
