# Day 21: Creator Analytics Overview

## Overview

Day 21 implements a comprehensive analytics dashboard for creators, showing aggregated metrics across all their videos. This provides creators with insights into their content performance, traffic sources, daily trends, and top-performing videos.

## Features Implemented

### Backend

1. **CreatorAnalyticsService** (`apps/api/src/videos/creator-analytics.service.ts`)
   - Aggregates analytics data from `VideoAnalyticsDaily` for all creator's videos
   - Calculates totals (views, unique viewers, play starts, completions, completion rate)
   - Aggregates traffic source breakdown
   - Builds daily trend series
   - Identifies top 5 performing videos with metadata

2. **CreatorAnalyticsController** (`apps/api/src/videos/creator-analytics.controller.ts`)
   - `GET /creator/analytics/overview?days=7|30`
   - Validates days parameter (must be 7 or 30)
   - Resolves user from Keycloak sub
   - Returns comprehensive analytics overview

3. **DTO** (`apps/api/src/videos/dto/creator-analytics-overview-query.dto.ts`)
   - Simple query DTO for days parameter

### Frontend

1. **API Helper** (`apps/web/src/lib/api/creator-analytics.ts`)
   - `getCreatorAnalyticsOverview()` function
   - TypeScript types for response structure

2. **Dashboard Page** (`apps/web/src/app/[locale]/dashboard/page.tsx`)
   - Analytics overview with summary cards
   - Traffic sources breakdown
   - Daily trend list
   - Top videos list with thumbnails
   - 7-day / 30-day toggle
   - Links to detailed video analytics

## API Endpoint

### GET /creator/analytics/overview

**Query Parameters:**
- `days` (optional): `7` or `30` (default: `30`)
- `locale` (optional): Locale for video titles (default: `en`)

**Response:**
```json
{
  "rangeDays": 30,
  "totals": {
    "views": 1240,
    "uniqueViewers": 880,
    "playStarts": 1010,
    "completions": 420,
    "completionRate": 41.58
  },
  "trafficSources": {
    "directViews": 220,
    "shareViews": 300,
    "channelViews": 180,
    "tagViews": 90,
    "searchViews": 260,
    "externalViews": 120,
    "unknownViews": 70
  },
  "dailyTrend": [
    {
      "date": "2026-03-01",
      "views": 40,
      "playStarts": 35,
      "completions": 11,
      "uniqueViewers": 29
    }
  ],
  "topVideos": [
    {
      "videoId": "vid_123",
      "slug": "how-to-edit-on-mobile",
      "title": "How to Edit on Mobile",
      "thumbnailUrl": "https://...",
      "views": 420,
      "playStarts": 360,
      "completions": 150,
      "completionRate": 41.67,
      "lastViewedAt": "2026-03-10T04:10:00.000Z"
    }
  ]
}
```

## Business Rules

1. **Creator Isolation**: Only videos where `uploaderId = currentUser.id` are included
2. **Data Source**: Uses aggregated `VideoAnalyticsDaily` data (not raw events)
3. **Date Range**: 
   - For `days=30`: Last 30 calendar days (today inclusive)
   - For `days=7`: Last 7 calendar days (today inclusive)
4. **Top Videos**: Top 5 videos by total views in the date range
5. **Locale Fallback**: Video titles fallback to English if requested locale not available

## Edge Cases Handled

- **No videos**: Returns all zeros and empty arrays
- **Videos but no analytics**: Returns zeros for totals, empty arrays for trend/top videos
- **Missing thumbnails**: Returns `null` for `thumbnailUrl`
- **Missing titles**: Falls back to English, then "Untitled"
- **Invalid days parameter**: Defaults to 30

## Testing

### Backend Tests

```bash
# Test with valid creator token
curl -X GET "http://localhost:3001/creator/analytics/overview?days=30" \
  -H "Authorization: Bearer $TOKEN"

# Test with 7 days
curl -X GET "http://localhost:3001/creator/analytics/overview?days=7" \
  -H "Authorization: Bearer $TOKEN"

# Test invalid days (should default to 30)
curl -X GET "http://localhost:3001/creator/analytics/overview?days=15" \
  -H "Authorization: Bearer $TOKEN"
```

### Frontend Tests

1. Visit `/[locale]/dashboard`
2. Verify analytics cards display correctly
3. Toggle between 7-day and 30-day views
4. Check traffic sources breakdown
5. Verify daily trend list
6. Verify top videos list with thumbnails
7. Test empty state (creator with no videos/analytics)

## Files Created/Modified

### Backend
- `apps/api/src/videos/creator-analytics.service.ts` (new)
- `apps/api/src/videos/creator-analytics.controller.ts` (new)
- `apps/api/src/videos/dto/creator-analytics-overview-query.dto.ts` (new)
- `apps/api/src/app.module.ts` (modified - registered new controller/service)

### Frontend
- `apps/web/src/lib/api/creator-analytics.ts` (new)
- `apps/web/src/app/[locale]/dashboard/page.tsx` (modified - replaced with analytics overview)

## Next Steps

- Consider adding charts/graphs for daily trend visualization (e.g., Recharts)
- Add export functionality for analytics data
- Add date range picker for custom date ranges
- Add comparison view (e.g., compare current period vs previous period)
