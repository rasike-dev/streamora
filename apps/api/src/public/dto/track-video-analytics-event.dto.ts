export enum VideoAnalyticsEventTypeDto {
  IMPRESSION = 'IMPRESSION',
  PLAY_START = 'PLAY_START',
  HEARTBEAT = 'HEARTBEAT',
  PLAY_COMPLETE = 'PLAY_COMPLETE',
}

export enum VideoTrafficSourceDto {
  DIRECT = 'DIRECT',
  SHARE = 'SHARE',
  CHANNEL = 'CHANNEL',
  TAG = 'TAG',
  SEARCH = 'SEARCH',
  EXTERNAL = 'EXTERNAL',
  UNKNOWN = 'UNKNOWN',
}

export class TrackVideoAnalyticsEventDto {
  sessionId!: string;
  eventType!: VideoAnalyticsEventTypeDto;
  trafficSource?: VideoTrafficSourceDto;
  locale?: string;
  progressPercent?: number;
  positionSeconds?: number;
  durationSeconds?: number;
}
