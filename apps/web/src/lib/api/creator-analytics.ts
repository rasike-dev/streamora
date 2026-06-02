import { apiFetch } from "../api";

export type CreatorAnalyticsOverview = {
  rangeDays: number;
  totals: {
    views: number;
    uniqueViewers: number;
    playStarts: number;
    completions: number;
    completionRate: number;
  };
  trafficSources: {
    directViews: number;
    shareViews: number;
    channelViews: number;
    tagViews: number;
    searchViews: number;
    externalViews: number;
    unknownViews: number;
  };
  dailyTrend: Array<{
    date: string;
    views: number;
    uniqueViewers: number;
    playStarts: number;
    completions: number;
  }>;
  topVideos: Array<{
    videoId: string;
    slug: string;
    title: string;
    thumbnailUrl: string | null;
    views: number;
    playStarts: number;
    completions: number;
    completionRate: number;
    lastViewedAt: string | null;
  }>;
};

export async function getCreatorAnalyticsOverview(
  days: 7 | 30,
  locale: string = 'en',
): Promise<CreatorAnalyticsOverview> {
  const res = await apiFetch(
    `/creator/analytics/overview?days=${days}&locale=${locale}`,
    {
      credentials: 'include',
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('FETCH_FAILED');
  }

  return res.json();
}
