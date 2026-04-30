"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCreatorAnalyticsOverview } from "@/lib/api/creator-analytics";

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border p-4 bg-white">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [days, setDays] = useState<7 | 30>(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCreatorAnalyticsOverview(days, locale);
        setData(result);
      } catch (e: any) {
        setError(e.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [days, locale]);

  if (loading) {
    return (
      <main className="min-h-dvh p-4">
        <div className="text-sm text-gray-600">Loading dashboard analytics...</div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-dvh p-4">
        <div className="text-sm text-red-600">
          {error || "Failed to load analytics overview."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
          <p className="text-sm text-gray-500">
            Overview for the last {data.rangeDays} days
          </p>
        </div>

        <div className="flex rounded-xl border overflow-hidden">
          <button
            className={`px-4 py-2 text-sm ${
              days === 7 ? "font-semibold bg-gray-100" : ""
            }`}
            onClick={() => setDays(7)}
          >
            7 days
          </button>
          <button
            className={`px-4 py-2 text-sm ${
              days === 30 ? "font-semibold bg-gray-100" : ""
            }`}
            onClick={() => setDays(30)}
          >
            30 days
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatCard label="Views" value={data.totals.views} />
        <StatCard
          label="Unique Viewers"
          value={data.totals.uniqueViewers}
        />
        <StatCard label="Play Starts" value={data.totals.playStarts} />
        <StatCard label="Completions" value={data.totals.completions} />
        <StatCard
          label="Completion Rate"
          value={`${data.totals.completionRate}%`}
        />
      </div>

      <section className="rounded-2xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Traffic Sources</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>Direct: {data.trafficSources.directViews}</div>
          <div>Share: {data.trafficSources.shareViews}</div>
          <div>Channel: {data.trafficSources.channelViews}</div>
          <div>Tag: {data.trafficSources.tagViews}</div>
          <div>Search: {data.trafficSources.searchViews}</div>
          <div>External: {data.trafficSources.externalViews}</div>
          <div>Unknown: {data.trafficSources.unknownViews}</div>
        </div>
      </section>

      <section className="rounded-2xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Daily Trend</h2>
        {data.dailyTrend.length === 0 ? (
          <div className="text-sm text-gray-500">No data available</div>
        ) : (
          <div className="space-y-2 text-sm">
            {data.dailyTrend.map((row: any) => (
              <div
                key={row.date}
                className="flex items-center justify-between border-b pb-2"
              >
                <span>{row.date}</span>
                <span>
                  Views {row.views} · Starts {row.playStarts} · Completions{" "}
                  {row.completions}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border p-4 bg-white">
        <h2 className="text-lg font-semibold mb-3">Top Videos</h2>
        {data.topVideos.length === 0 ? (
          <div className="text-sm text-gray-500">No videos with analytics yet</div>
        ) : (
          <div className="space-y-3">
            {data.topVideos.map((video: any) => (
              <div
                key={video.videoId}
                className="flex items-center gap-3 border rounded-xl p-3"
              >
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-24 h-14 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-24 h-14 rounded-lg bg-gray-100" />
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{video.title}</div>
                  <div className="text-sm text-gray-500">
                    {video.views} views · {video.playStarts} starts ·{" "}
                    {video.completionRate}% completion
                  </div>
                </div>
                <Link
                  href={`/${locale}/dashboard/videos/${video.videoId}/analytics`}
                  className="text-sm text-blue-600 underline"
                >
                  View Analytics
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-3">
        <Link
          href={`/${locale}/dashboard/uploads`}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          Bulk Upload
        </Link>
        <Link
          href={`/${locale}/dashboard/videos`}
          className="rounded-xl border px-4 py-2 text-sm"
        >
          My Videos
        </Link>
      </div>
    </main>
  );
}
