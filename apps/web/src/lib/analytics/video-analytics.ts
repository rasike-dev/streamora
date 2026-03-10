export type VideoTrafficSource =
  | 'DIRECT'
  | 'SHARE'
  | 'CHANNEL'
  | 'TAG'
  | 'SEARCH'
  | 'EXTERNAL'
  | 'UNKNOWN';

export type VideoAnalyticsEventType =
  | 'IMPRESSION'
  | 'PLAY_START'
  | 'HEARTBEAT'
  | 'PLAY_COMPLETE';

function getOrCreateSessionId(videoId: string) {
  const key = `streamora.video.session.${videoId}`;
  const existing = sessionStorage.getItem(key);
  if (existing) return existing;

  const created = crypto.randomUUID();
  sessionStorage.setItem(key, created);
  return created;
}

export async function trackVideoEvent(args: {
  videoId: string;
  eventType: VideoAnalyticsEventType;
  trafficSource?: VideoTrafficSource;
  locale?: string;
  progressPercent?: number;
  positionSeconds?: number;
  durationSeconds?: number;
}) {
  const sessionId = getOrCreateSessionId(args.videoId);
  const api = process.env.NEXT_PUBLIC_API_URL!;

  await fetch(`${api}/analytics/videos/${args.videoId}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    body: JSON.stringify({
      sessionId,
      eventType: args.eventType,
      trafficSource: args.trafficSource ?? 'UNKNOWN',
      locale: args.locale,
      progressPercent: args.progressPercent,
      positionSeconds: args.positionSeconds,
      durationSeconds: args.durationSeconds,
    }),
  }).catch(() => {});
}
