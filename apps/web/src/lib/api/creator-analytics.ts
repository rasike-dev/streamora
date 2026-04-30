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
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  const res = await fetch(
    `${api}/creator/analytics/overview?days=${days}&locale=${locale}`,
    {
      credentials: 'include',
      cache: 'no-store',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );

  if (!res.ok) {
    throw new Error('Failed to fetch creator analytics overview');
  }

  return res.json();
}
