/**
 * CDN URL utility for media assets
 * Uses CDN_BASE_URL if set, otherwise falls back to GCS direct URLs
 */
export function getCdnUrl(bucket: string, objectKey: string): string {
  const cdnBase = process.env.CDN_BASE_URL;
  if (cdnBase) {
    // CDN base URL should already include the path structure
    // e.g., https://cdn.streamora.app
    return `${cdnBase}/${objectKey}`;
  }

  // Fallback to direct GCS URL
  return `https://storage.googleapis.com/${bucket}/${objectKey}`;
}

/**
 * Get CDN URL with cache headers hint
 * For HLS segments, thumbnails, subtitles - long cache
 * For playlists - short cache
 */
export function getCdnUrlWithCache(
  bucket: string,
  objectKey: string,
  assetType: 'segment' | 'playlist' | 'thumbnail' | 'subtitle',
): { url: string; cacheControl: string } {
  const url = getCdnUrl(bucket, objectKey);

  // Cache control headers
  let cacheControl: string;
  switch (assetType) {
    case 'playlist':
      // Playlists change frequently (every 60 seconds)
      cacheControl = 'public, max-age=60';
      break;
    case 'segment':
    case 'thumbnail':
    case 'subtitle':
      // Segments, thumbnails, subtitles rarely change
      cacheControl = 'public, max-age=86400'; // 24 hours
      break;
    default:
      cacheControl = 'public, max-age=3600';
  }

  return { url, cacheControl };
}
