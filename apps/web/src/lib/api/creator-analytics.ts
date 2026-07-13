import { apiFetch } from "../api";

function emptyCreatorAnalyticsOverview(days: number): CreatorAnalyticsOverview {
  return {
    rangeDays: days,
    totals: {
      views: 0,
      uniqueViewers: 0,
      playStarts: 0,
      completions: 0,
      completionRate: 0,
    },
    trafficSources: {
      directViews: 0,
      shareViews: 0,
      channelViews: 0,
      tagViews: 0,
      searchViews: 0,
      externalViews: 0,
      unknownViews: 0,
    },
    dailyTrend: [],
    topVideos: [],
  };
}

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
    if (res.status === 404) {
      return emptyCreatorAnalyticsOverview(days);
    }
    throw new Error('FETCH_FAILED');
  }

  return res.json();
}
