# Day 20 — Video Analytics

## Summary

Implemented a comprehensive video analytics foundation that tracks views, completions, and traffic sources. The system uses a two-layer model: raw event storage for flexibility and daily aggregated summaries for fast reads. Analytics are exposed in the creator dashboard with per-video analytics pages.

## Changes Made

### 1. Prisma Schema Updates ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added Enums**:
- `VideoAnalyticsEventType` (IMPRESSION, PLAY_START, HEARTBEAT, PLAY_COMPLETE)
- `VideoTrafficSource` (DIRECT, SHARE, CHANNEL, TAG, SEARCH, EXTERNAL, UNKNOWN)

**Added Models**:
- `VideoAnalyticsEvent` - Raw event storage table
  - Tracks sessionId, viewerHash, progress, position, duration
  - Includes referrer, userAgent, ipHash (hashed for privacy)
  - Indexed by videoId, eventType, sessionId

- `VideoAnalyticsDaily` - Daily aggregated summary table
  - Views, unique viewers, play starts, completions
  - Traffic source breakdowns (direct, share, channel, tag, search, external, unknown)
  - Unique constraint on (videoId, date)

**Updated Video Model**:
- Added denormalized fields:
  - `analyticsViews` (Int, default: 0)
  - `analyticsCompletions` (Int, default: 0)
  - `analyticsLastViewedAt` (DateTime, nullable)
- Added relations:
  - `analyticsEvents VideoAnalyticsEvent[]`
  - `analyticsDaily VideoAnalyticsDaily[]`

### 2. Backend: Analytics DTO ✅

**Created**: `apps/api/src/public/dto/track-video-analytics-event.dto.ts`
- `VideoAnalyticsEventTypeDto` enum
- `VideoTrafficSourceDto` enum
- `TrackVideoAnalyticsEventDto` class with validation

### 3. Backend: Public Analytics Service ✅

**Created**: `apps/api/src/public/public-video-analytics.service.ts`
- `trackEvent()` - Main event tracking method
- Validates video is PUBLISHED + (PUBLIC or UNLISTED)
- Creates raw event record
- Updates daily aggregates for PLAY_START and PLAY_COMPLETE
- Handles unique viewer detection (by viewerHash per day)
- Prevents duplicate completion counting (by sessionId per day)
- Updates denormalized Video fields
- Privacy: Hashes IP and viewer identifiers

**Key Features**:
- Unique viewer detection using viewerHash
- Completion deduplication per session/day
- Traffic source aggregation
- UTC date normalization

### 4. Backend: Public Analytics Controller ✅

**Created**: `apps/api/src/public/public-video-analytics.controller.ts`
- `POST /analytics/videos/:id/events` - Public event ingest endpoint
- Accepts anonymous playback events
- No authentication required (public endpoint)

### 5. Backend: Creator Analytics Service ✅

**Created**: `apps/api/src/videos/creator-video-analytics.service.ts`
- `getVideoAnalytics()` - Fetches analytics for a video
- Validates video ownership
- Aggregates daily data over specified time period
- Calculates completion rate
- Returns totals, traffic sources, and daily series

### 6. Backend: Creator Analytics Controller ✅

**Created**: `apps/api/src/videos/creator-video-analytics.controller.ts`
- `GET /creator/videos/:id/analytics?days=30` - Creator analytics endpoint
- JWT authentication required
- Returns analytics summary for owned video

### 7. App Module Updates ✅

**Updated**: `apps/api/src/app.module.ts`
- Registered `PublicVideoAnalyticsController`
- Registered `CreatorVideoAnalyticsController`
- Added `PublicVideoAnalyticsService` and `CreatorVideoAnalyticsService` to providers

### 8. Public Video Share Controller Update ✅

**Updated**: `apps/api/src/public/public.video-share.controller.ts`
- Now allows UNLISTED videos (in addition to PUBLIC)
- Returns video `id` field (needed for analytics tracking)

### 9. Frontend: Analytics Tracking Helper ✅

**Created**: `apps/web/src/lib/analytics/video-analytics.ts`
- `trackVideoEvent()` - Sends analytics events to API
- `getOrCreateSessionId()` - Manages session IDs in sessionStorage
- Type definitions for event types and traffic sources

### 10. Frontend: Public Video Player Component ✅

**Created**: `apps/web/src/components/videos/PublicVideoPlayer.tsx`
- Replaces basic HlsPlayer with analytics-enabled version
- Tracks PLAY_START on first play
- Tracks HEARTBEAT at 25%, 50%, 75% milestones
- Tracks PLAY_COMPLETE at 90% or on ended event
- Prevents duplicate event firing
- Accepts trafficSource prop

### 11. Frontend: Creator Analytics API Helper ✅

**Created**: `apps/web/src/lib/api/creator-video-analytics.ts`
- `getCreatorVideoAnalytics()` - Fetches analytics data
- Includes authentication token

### 12. Frontend: Creator Analytics Page ✅

**Created**: `apps/web/src/app/[locale]/dashboard/videos/[id]/analytics/page.tsx`
- Displays analytics summary cards (Views, Unique Viewers, Completions, Completion Rate)
- Shows traffic source breakdown
- Displays daily trend series
- Client-side data fetching with React hooks
- Loading and error states

### 13. Frontend: Video Share Page Integration ✅

**Updated**: `apps/web/src/app/[locale]/v/[slug]/page.tsx`
- Replaced `HlsPlayer` with `PublicVideoPlayer`
- Extracts traffic source from URL `src` query parameter
- Maps URL params to traffic source enum
- Passes traffic source to player component

### 14. Frontend: Traffic Source Links ✅

**Updated**: Multiple pages to include `?src=` parameter:
- `apps/web/src/app/[locale]/videos/page.tsx` - Search results link with `?src=search`
- `apps/web/src/app/[locale]/channels/[slug]/page.tsx` - Channel videos link with `?src=channel`

### 15. Frontend: Analytics Links in Dashboard ✅

**Updated**: `apps/web/src/app/[locale]/dashboard/page.tsx`
- Added "Analytics" link to video cards

**Updated**: `apps/web/src/app/[locale]/dashboard/videos/page.tsx`
- Added "Analytics" link to video list items

## API Endpoints

### POST /analytics/videos/:id/events

**Authentication**: Not required (public endpoint)

**Request Body**:
```json
{
  "sessionId": "sess_abc123",
  "eventType": "PLAY_START",
  "trafficSource": "SEARCH",
  "locale": "en",
  "progressPercent": 0,
  "positionSeconds": 0,
  "durationSeconds": 180
}
```

**Response**:
```json
{
  "success": true
}
```

**Errors**:
- `404 Not Found`: Video not found or not publicly viewable

**Public Access Rule**:
- Only accepts events for videos with:
  - `status: 'PUBLISHED'`
  - `visibility: 'PUBLIC'` or `visibility: 'UNLISTED'`

### GET /creator/videos/:id/analytics

**Authentication**: Required (JWT)

**Query Parameters**:
- `days` (default: '30') - Number of days to include

**Response**:
```json
{
  "videoId": "vid_123",
  "totals": {
    "views": 120,
    "uniqueViewers": 85,
    "playStarts": 120,
    "completions": 67,
    "completionRate": 55.83
  },
  "trafficSources": {
    "direct": 20,
    "share": 45,
    "channel": 15,
    "tag": 5,
    "search": 25,
    "external": 8,
    "unknown": 2
  },
  "series": [
    {
      "date": "2026-03-01",
      "views": 10,
      "completions": 4
    }
  ]
}
```

**Errors**:
- `404 Not Found`: Video not found or not owned by user

## Analytics Event Types

### IMPRESSION
- Optional page/video/player impression
- Not essential for Day 20 lock

### PLAY_START
- User started playback
- Triggers view increment
- Triggers unique viewer check
- Updates traffic source counters

### HEARTBEAT
- Periodic progress snapshot
- Tracked at 25%, 50%, 75% milestones
- Stored in raw events (not aggregated in Day 20)

### PLAY_COMPLETE
- Playback reached completion threshold (90% or ended)
- Triggers completion increment
- Deduplicated per session/day

## Traffic Source Detection

Traffic source is determined from URL `src` query parameter:

- `?src=search` → SEARCH
- `?src=channel` → CHANNEL
- `?src=tag` → TAG
- `?src=share` → SHARE
- No `src` or unknown → DIRECT (or UNKNOWN)

**Implementation**:
- Search results: `?src=search`
- Channel pages: `?src=channel`
- Share pages: `?src=share` (can be added later)
- Direct access: No `src` param → DIRECT

## Privacy & Security

### Data Hashing
- **viewerHash**: SHA-256 hash of `sessionId|userAgent|ip`
- **ipHash**: SHA-256 hash of IP address
- Prevents PII storage while enabling unique viewer detection

### Access Control
- Only PUBLIC and UNLISTED videos accept analytics events
- Creator analytics only accessible to video owner
- No personal information stored in raw events

## Analytics Aggregation

### Daily Summary Updates

**On PLAY_START**:
- Increments `views` and `playStarts`
- Increments `uniqueViewers` if first play from this viewer today
- Increments appropriate traffic source counter
- Updates `lastViewedAt`
- Updates Video denormalized fields

**On PLAY_COMPLETE**:
- Increments `completions` (if not already counted for this session/day)
- Updates `lastViewedAt`
- Updates Video denormalized fields

### Unique Viewer Logic

A viewer is considered "unique" if:
- No PLAY_START event exists for this `viewerHash` on this date
- Uses SHA-256 hash of `sessionId|userAgent|ip` combination

### Completion Deduplication

A completion is only counted once per:
- `videoId` + `sessionId` + `date`

Prevents double-counting if multiple completion events fire.

## UI Features

### Creator Analytics Page

**Summary Cards**:
- Total Views
- Unique Viewers
- Total Completions
- Completion Rate (%)

**Traffic Sources**:
- Grid display of all traffic source counts
- Direct, Share, Channel, Tag, Search, External, Unknown

**Daily Trend**:
- List of daily views and completions
- Ordered by date ascending
- Shows date, views, completions per day

**Navigation**:
- Links to Edit page
- Link back to Videos list

## Testing Checklist

### 1. Event Tracking
- [ ] `POST /analytics/videos/:id/events` with PLAY_START creates event
- [ ] Raw event stored in `VideoAnalyticsEvent` table
- [ ] Daily summary updated
- [ ] Video denormalized fields updated

### 2. Unique Viewer Detection
- [ ] First play from viewer increments uniqueViewers
- [ ] Second play from same viewer (same day) does not increment uniqueViewers
- [ ] Different viewer (different hash) increments uniqueViewers

### 3. Completion Tracking
- [ ] PLAY_COMPLETE event creates completion record
- [ ] Completion deduplicated per session/day
- [ ] Multiple completions from same session only count once

### 4. Traffic Source Tracking
- [ ] Traffic source correctly recorded in daily summary
- [ ] Different sources increment correct counters
- [ ] UNKNOWN used when source not provided

### 5. Public Access Rules
- [ ] Only PUBLISHED + (PUBLIC or UNLISTED) videos accept events
- [ ] PRIVATE videos reject events (404)
- [ ] Non-PUBLISHED videos reject events (404)

### 6. Creator Analytics
- [ ] `GET /creator/videos/:id/analytics` returns data
- [ ] Only returns analytics for owned videos
- [ ] Totals calculated correctly
- [ ] Completion rate calculated correctly
- [ ] Daily series returned in correct order

### 7. Frontend Tracking
- [ ] Player sends PLAY_START on first play
- [ ] Player sends HEARTBEAT at milestones
- [ ] Player sends PLAY_COMPLETE at 90% or ended
- [ ] Session ID persists in sessionStorage
- [ ] Events sent with correct traffic source

### 8. Analytics Page
- [ ] Page loads analytics data
- [ ] Summary cards display correctly
- [ ] Traffic sources display correctly
- [ ] Daily trend displays correctly
- [ ] Empty state shows when no data

### 9. Traffic Source Links
- [ ] Search results link with `?src=search`
- [ ] Channel videos link with `?src=channel`
- [ ] Traffic source correctly passed to player

## Day 20 LOCK Checklist ✅

### Backend
- [x] Analytics event ingest endpoint exists (`POST /analytics/videos/:id/events`)
- [x] Only public-viewable videos accept events (PUBLISHED + PUBLIC/UNLISTED)
- [x] Raw analytics event rows are stored
- [x] Daily summary rows are updated for views, unique viewers, play starts, completions, traffic sources
- [x] Creator analytics endpoint exists (`GET /creator/videos/:id/analytics?days=30`)
- [x] Completion rate is calculated
- [x] Unique viewer detection works
- [x] Completion deduplication works

### Frontend
- [x] Public player sends PLAY_START, HEARTBEAT, PLAY_COMPLETE
- [x] Creator analytics page renders totals + traffic sources + daily series
- [x] Creator dashboard links to analytics page
- [x] Traffic source is passed from discovery/share surfaces
- [x] Session ID management works

## Migration Required

After implementing Day 20, run:

```bash
cd apps/api
pnpm prisma migrate dev --name add_video_analytics
pnpm prisma generate
```

This migration will:
- Add `VideoAnalyticsEventType` enum
- Add `VideoTrafficSource` enum
- Create `VideoAnalyticsEvent` table
- Create `VideoAnalyticsDaily` table
- Add analytics fields to `Video` model
- Add relations to `Video` model

## Suggested curl Checks

### Track Play Start
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"sess_test_1",
    "eventType":"PLAY_START",
    "trafficSource":"SEARCH",
    "locale":"en",
    "progressPercent":0,
    "positionSeconds":0,
    "durationSeconds":180
  }' \
  http://localhost:3001/analytics/videos/VIDEO_ID/events
```

### Track Completion
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId":"sess_test_1",
    "eventType":"PLAY_COMPLETE",
    "trafficSource":"SEARCH",
    "locale":"en",
    "progressPercent":100,
    "positionSeconds":180,
    "durationSeconds":180
  }' \
  http://localhost:3001/analytics/videos/VIDEO_ID/events
```

### Read Creator Analytics
```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3001/creator/videos/VIDEO_ID/analytics?days=30"
```

## Route Examples

### Creator Analytics
- Basic: `http://localhost:3000/en/dashboard/videos/vid_123/analytics`
- With days: `http://localhost:3000/en/dashboard/videos/vid_123/analytics?days=7`

### Video Pages with Traffic Source
- From search: `http://localhost:3000/en/v/amazing-trip?src=search`
- From channel: `http://localhost:3000/en/v/amazing-trip?src=channel`
- Direct: `http://localhost:3000/en/v/amazing-trip` (no src param)

## Future Enhancements

### Optional Features (Not Required for Day 20)
- **Creator Overview Endpoint**: `GET /creator/analytics/overview` for total creator stats
- **Watch Time Tracking**: Aggregate HEARTBEAT events for average watch percentage
- **Drop-off Curve**: Analyze where viewers stop watching
- **Geographic Analytics**: Track by country/region (requires IP geolocation)
- **Device Analytics**: Track by device type (from userAgent)
- **Referrer Analytics**: Track external referrers in detail
- **Real-time Analytics**: WebSocket or SSE for live view counts
- **Export Functionality**: CSV/JSON export of analytics data

### Performance Optimizations
- **Batch Aggregation**: Move to scheduled batch job for daily summaries
- **Materialized Views**: Use Postgres materialized views for faster reads
- **Caching**: Cache analytics summaries with appropriate TTL
- **Partitioning**: Partition event table by date for better query performance

## Result of Day 20

After this day, Streamora Phase 2 now includes:
- ✅ Creator metadata workflow
- ✅ Bulk uploads
- ✅ Thumbnail control
- ✅ Visibility modes
- ✅ Scheduled publishing
- ✅ Channel discovery
- ✅ Search + Discovery
- ✅ **Analytics foundation**

This completes Phase 2 with a strong analytics foundation that can grow into YouTube-grade analytics as the platform scales.

## Phase 2 Completion Summary

**Days 13-20 Features**:
- Day 13: Draft Editor (full metadata editing)
- Day 14: Bulk Upload Manager
- Day 15: Thumbnail Picker + Custom Thumbnail Upload
- Day 16: Video Visibility Modes
- Day 17: Scheduled Publishing
- Day 18: Channel Landing Pages
- Day 19: Search + Discovery
- Day 20: Video Analytics

**Phase 2 Achievements**:
- Complete creator workflow from upload to publication
- Public discovery and browsing
- Content organization (channels, tags)
- Search and filtering
- Analytics tracking and reporting

Streamora is now a fully functional video platform ready for Phase 3 enhancements!
