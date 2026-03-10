"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { getCreatorVideos } from "@/lib/api/creator-videos";

export default function CreatorVideosPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params.locale as string) || "en";

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const q = searchParams.get("q") ?? "";
  const status = searchParams.get("status") ?? "";
  const visibility = searchParams.get("visibility") ?? "";
  const page = Number(searchParams.get("page") ?? "1");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await getCreatorVideos({
          locale,
          q: q || undefined,
          status: status || undefined,
          visibility: visibility || undefined,
          page,
          pageSize: 12,
        });
        setData(result);
      } catch (e: any) {
        setError(e.message || "Failed to load videos");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [locale, q, status, visibility, page]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl p-4">
        <div className="text-sm text-gray-600">Loading...</div>
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
      <form
        method="get"
        action={`/${locale}/dashboard/videos`}
        className="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <h1 className="text-xl font-semibold">My Videos</h1>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search your videos..."
            className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
          />

          <select
            name="status"
            defaultValue={status}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">All statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="READY">READY</option>
            <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
            <option value="APPROVED">APPROVED</option>
            <option value="PUBLISHED">PUBLISHED</option>
            <option value="REJECTED">REJECTED</option>
          </select>

          <select
            name="visibility"
            defaultValue={visibility}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            <option value="">All visibility</option>
            <option value="PUBLIC">PUBLIC</option>
            <option value="UNLISTED">UNLISTED</option>
            <option value="PRIVATE">PRIVATE</option>
          </select>
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-sm text-white"
          >
            Search
          </button>
          <Link
            href={`/${locale}/dashboard/videos`}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      <section className="space-y-3">
        {data.items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            No videos matched your filters.
          </div>
        ) : (
          data.items.map((video: any) => (
            <div
              key={video.id}
              className="flex gap-4 rounded-2xl border bg-white p-4 shadow-sm"
            >
              <div className="h-24 w-40 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="truncate text-sm font-semibold">{video.title}</h2>
                {video.tagline ? (
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                    {video.tagline}
                  </p>
                ) : null}

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border px-2 py-0.5">
                    {video.status}
                  </span>
                  <span className="rounded-full border px-2 py-0.5">
                    {video.visibility}
                  </span>
                  {video.scheduledAt ? (
                    <span className="rounded-full border px-2 py-0.5">
                      Scheduled
                    </span>
                  ) : null}
                </div>

                <div className="mt-3 flex gap-2">
                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/edit`}
                    className="rounded-xl border px-3 py-1 text-sm"
                  >
                    Edit
                  </Link>

                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/thumbnails`}
                    className="rounded-xl border px-3 py-1 text-sm"
                  >
                    Thumbnails
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/videos/${video.id}/analytics`}
                    className="rounded-xl border px-3 py-1 text-sm"
                  >
                    Analytics
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </section>

      {data.pagination.totalPages > 1 && (
        <section className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </div>

          <div className="flex gap-2">
            {data.pagination.page > 1 ? (
              <Link
                href={`/${locale}/dashboard/videos?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status ? { status } : {}),
                  ...(visibility ? { visibility } : {}),
                  page: String(data.pagination.page - 1),
                }).toString()}`}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-xl border px-4 py-2 text-sm text-gray-400">
                Previous
              </span>
            )}

            {data.pagination.page < data.pagination.totalPages ? (
              <Link
                href={`/${locale}/dashboard/videos?${new URLSearchParams({
                  ...(q ? { q } : {}),
                  ...(status ? { status } : {}),
                  ...(visibility ? { visibility } : {}),
                  page: String(data.pagination.page + 1),
                }).toString()}`}
                className="rounded-xl border px-4 py-2 text-sm"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-xl border px-4 py-2 text-sm text-gray-400">
                Next
              </span>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
