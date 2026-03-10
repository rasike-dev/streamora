"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCreatorVideoAnalytics } from "@/lib/api/creator-video-analytics";

export default function VideoAnalyticsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";
  const id = params.id as string;
  const days = Number(searchParams.get("days") ?? "30");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCreatorVideoAnalytics(id, days);
        setData(result);
      } catch (e: any) {
        setError(e.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id, days]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-4">
        <div className="text-sm text-gray-600">Loading analytics...</div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-4">
        <div className="text-sm text-red-600">{error}</div>
      </main>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Video Analytics</h1>
        <div className="flex gap-2">
          <Link
            href={`/${locale}/dashboard/videos/${id}/edit`}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Edit
          </Link>
          <Link
            href={`/${locale}/dashboard/videos`}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Back
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Views</div>
          <div className="mt-1 text-2xl font-semibold">{data.totals.views}</div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Unique Viewers</div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.uniqueViewers}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Completions</div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.completions}
          </div>
        </div>

        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="text-sm text-gray-500">Completion Rate</div>
          <div className="mt-1 text-2xl font-semibold">
            {data.totals.completionRate}%
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Traffic Sources</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border p-3 text-sm">
            Direct: {data.trafficSources.direct}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            Share: {data.trafficSources.share}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            Channel: {data.trafficSources.channel}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            Tag: {data.trafficSources.tag}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            Search: {data.trafficSources.search}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            External: {data.trafficSources.external}
          </div>
          <div className="rounded-xl border p-3 text-sm">
            Unknown: {data.trafficSources.unknown}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold">Daily Trend</h2>
        <div className="mt-4 space-y-2">
          {data.series.length === 0 ? (
            <p className="text-sm text-gray-600">No analytics yet.</p>
          ) : (
            data.series.map((row: any) => (
              <div
                key={row.date}
                className="flex items-center justify-between rounded-xl border p-3 text-sm"
              >
                <span>{row.date}</span>
                <span>Views: {row.views}</span>
                <span>Completions: {row.completions}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
