# Day 8 — HLS Renditions + Playback

## Summary

Implemented HLS (HTTP Live Streaming) generation with multiple renditions (360p + 720p), playback API endpoint, and watch page with hls.js support.

## Changes Made

### 1. Database Schema ✅

**Updated**: `apps/api/prisma/schema.prisma`

**Added**: `VideoRendition` model
- `videoId` (foreign key to Video)
- `quality` (e.g., "360p", "720p")
- `playlistKey` (path to variant playlist)
- `bandwidth`, `width`, `height`, `codec`
- Unique constraint on `[videoId, quality]`

**Updated**: `VideoAsset` model
- Added `hlsBucket` (GCS bucket for HLS files)
- Added `hlsMasterKey` (path to master.m3u8)

**Updated**: `Video` model
- Added `renditions VideoRendition[]` relation

### 2. Worker HLS Generation ✅

**Updated**: `apps/worker/src/worker.ts`

**Added Functions**:
- `uploadDirToGcs()` - Uploads entire directory to GCS
- `generateHls()` - Generates HLS with 360p + 720p renditions using FFmpeg

**Updated**: `processMessage()`
- Generates HLS after thumbnails
- Uploads HLS directory to GCS
- Updates VideoAsset with HLS pointers
- Creates VideoRendition records

### 3. Playback API ✅

**Created**: `apps/api/src/videos/videos.playback.controller.ts`
- **Endpoint**: `GET /videos/:id/playback`
- Returns master URL and thumbnail URL
- Public access (for now)

### 4. Watch Page ✅

**Created**: `apps/web/src/app/[locale]/watch/[videoId]/page.tsx`
- Uses hls.js for Chrome/Firefox
- Uses native HLS for Safari/iOS
- Displays video player with controls

**Updated**: Dashboard
- Added "Watch" link for READY videos

**Dependencies**: Added `hls.js` to web app

## Installation Steps

### 1. Install Dependencies

```bash
# From repo root
cd apps/web
pnpm add hls.js
cd ../../
```

### 2. Run Prisma Migration

```bash
# From repo root
cd apps/api
pnpm prisma migrate dev --name day8_hls
pnpm prisma generate
cd ../../
```

### 3. Update Worker Environment

Add to `apps/worker/.env`:

```bash
GCS_BUCKET_RENDITIONS=streamora-renditions-dev
```

### 4. Create GCS Bucket for Renditions

```bash
# Create bucket
gsutil mb -p YOUR_PROJECT gs://streamora-renditions-dev

# Make bucket public (for dev)
gsutil iam ch allUsers:objectViewer gs://streamora-renditions-dev
```

Or via GCP Console:
1. Go to **Cloud Storage** → **Buckets**
2. Click **Create Bucket**
3. Name: `streamora-renditions-dev`
4. Click **Create**
5. Click on bucket → **Permissions** → **Add Principal**
6. Principal: `allUsers`
7. Role: **Storage Object Viewer**
8. Click **Save**

### 5. Verify Worker Has Permissions

Ensure service account has:
- **Storage Object Creator** on renditions bucket
- **Storage Object Viewer** on originals bucket (to download)

## Testing

### 1. Test End-to-End Flow

1. Upload a video via web UI
2. Wait for processing to complete
3. **Verify**:
   - Worker generates HLS files
   - Files uploaded to GCS: `renditions/{videoId}/master.m3u8`
   - VideoAsset has `hlsBucket` and `hlsMasterKey`
   - VideoRendition records created (360p + 720p)
   - Video.status = READY

### 2. Check HLS Files in GCS

```bash
# List HLS files
gsutil ls -r gs://streamora-renditions-dev/renditions/{videoId}/
```

Should show:
- `master.m3u8`
- `0/playlist.m3u8` + `seg_*.ts` files
- `1/playlist.m3u8` + `seg_*.ts` files

### 3. Test Playback API

```bash
# Get playback URL
curl http://localhost:3001/videos/{videoId}/playback
```

**Expected**:
```json
{
  "videoId": "clx123abc",
  "masterUrl": "https://storage.googleapis.com/streamora-renditions-dev/renditions/clx123abc/master.m3u8",
  "thumbUrl": "https://storage.googleapis.com/streamora-thumbs-dev/thumbs/clx123abc/thumb_0.jpg"
}
```

### 4. Test Watch Page

1. Go to dashboard: `http://localhost:3000/en/dashboard`
2. Click "Watch" link on a READY video
3. **Verify**:
   - Video player loads
   - HLS playback works
   - Quality selector available (360p/720p)

### 5. Test Browser Compatibility

**Chrome/Firefox**:
- Should use hls.js
- Check browser console for hls.js logs

**Safari/iOS**:
- Should use native HLS
- No hls.js needed

## HLS Generation Details

### Output Structure

```
renditions/{videoId}/
  ├── master.m3u8          # Master playlist
  ├── 0/
  │   ├── playlist.m3u8    # 360p variant playlist
  │   └── seg_000.ts       # Segments
  │   └── seg_001.ts
  │   └── ...
  └── 1/
      ├── playlist.m3u8    # 720p variant playlist
      └── seg_000.ts
      └── ...
```

### Rendition Settings

**360p**:
- Resolution: 640x360
- Bitrate: 800 kbps
- Codec: H.264 + AAC

**720p**:
- Resolution: 1280x720
- Bitrate: 2800 kbps
- Codec: H.264 + AAC

### FFmpeg Parameters

- **Segment duration**: 4 seconds
- **Playlist type**: VOD (Video on Demand)
- **Independent segments**: Enabled
- **CRF**: 20 (quality setting)

## API Endpoint

### GET /videos/:id/playback

**Authentication**: Not required (public for now)

**Path Parameter**: `id` (videoId)

**Response**:
```json
{
  "videoId": "clx123abc",
  "masterUrl": "https://storage.googleapis.com/streamora-renditions-dev/renditions/clx123abc/master.m3u8",
  "thumbUrl": "https://storage.googleapis.com/streamora-thumbs-dev/thumbs/clx123abc/thumb_0.jpg"
}
```

**Errors**:
- `404 Not Found`: Playback not ready (HLS not generated yet)

## Watch Page

### Route

`/[locale]/watch/[videoId]`

Example: `/en/watch/clx123abc`

### Features

- **Auto-detection**: Uses native HLS on Safari, hls.js on others
- **Controls**: Standard HTML5 video controls
- **Responsive**: Mobile-friendly layout
- **Error handling**: Shows error message if playback fails

### Browser Support

- ✅ Chrome/Edge: hls.js
- ✅ Firefox: hls.js
- ✅ Safari/iOS: Native HLS
- ✅ Android Chrome: hls.js

## Database Changes

### VideoRendition Table

**Fields**:
- `id`: Primary key
- `videoId`: Foreign key to Video
- `quality`: "360p" | "720p" (unique per video)
- `playlistKey`: GCS path to variant playlist
- `bandwidth`: Bitrate in bps
- `width`, `height`: Resolution
- `codec`: Codec string

### VideoAsset Updates

**New Fields**:
- `hlsBucket`: GCS bucket name
- `hlsMasterKey`: Path to master.m3u8

## Day 8 LOCK Checklist ✅

- [ ] Prisma migration applied successfully
- [ ] VideoRendition table created
- [ ] Worker environment updated with `GCS_BUCKET_RENDITIONS`
- [ ] GCS renditions bucket created and public
- [ ] Worker generates HLS files
- [ ] Master playlist created: `renditions/{videoId}/master.m3u8`
- [ ] Variant playlists created: `0/playlist.m3u8`, `1/playlist.m3u8`
- [ ] Segments uploaded to GCS
- [ ] VideoAsset.hlsBucket + hlsMasterKey populated
- [ ] VideoRendition rows created (360p + 720p)
- [ ] Playback API returns masterUrl
- [ ] Watch page loads video
- [ ] Playback works on Chrome (hls.js)
- [ ] Playback works on Safari (native HLS)

## Troubleshooting

### "Playback not ready"

- Check VideoAsset has `hlsBucket` and `hlsMasterKey`
- Verify worker completed processing
- Check video status is READY

### "HLS not supported"

- Browser doesn't support HLS
- Check browser console for errors
- Verify hls.js loaded correctly

### "CORS errors"

- GCS bucket needs CORS configuration
- Add CORS config:
  ```bash
  gsutil cors set cors.json gs://streamora-renditions-dev
  ```
  Where `cors.json`:
  ```json
  [
    {
      "origin": ["*"],
      "method": ["GET", "HEAD"],
      "responseHeader": ["Content-Type"],
      "maxAgeSeconds": 3600
    }
  ]
  ```

### "FFmpeg errors"

- Check ffmpeg is installed: `ffmpeg -version`
- Verify input video is valid
- Check worker logs for FFmpeg output

### "Segments not loading"

- Verify bucket is public
- Check segment URLs in playlist
- Verify CORS is configured

## Next Steps

After Day 8 is locked:
- **Day 9**: Moderation workflow (pending → approved → published)
- Enforce visibility rules
- Admin moderation queue
