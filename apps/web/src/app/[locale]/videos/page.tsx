import Link from "next/link";
import { getPublicVideos } from "@/lib/api/public-videos";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    channel?: string;
    tag?: string;
    page?: string;
  }>;
};

export default async function VideosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;

  const q = sp.q ?? "";
  const channel = sp.channel ?? "";
  const tag = sp.tag ?? "";
  const page = Number(sp.page ?? "1");

  const data = await getPublicVideos({
    locale,
    q: q || undefined,
    channel: channel || undefined,
    tag: tag || undefined,
    page,
    pageSize: 12,
  });

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <form
        method="get"
        action={`/${locale}/videos`}
        className="rounded-2xl border bg-white p-4 shadow-sm"
      >
        <h1 className="text-xl font-semibold">Discover Videos</h1>

        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search videos..."
            className="rounded-xl border px-3 py-2 text-sm md:col-span-2"
          />
          <input
            name="channel"
            defaultValue={channel}
            placeholder="Channel slug"
            className="rounded-xl border px-3 py-2 text-sm"
          />
          <input
            name="tag"
            defaultValue={tag}
            placeholder="Tag slug"
            className="rounded-xl border px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            className="rounded-xl bg-black px-4 py-2 text-sm text-white"
          >
            Search
          </button>

          <Link
            href={`/${locale}/videos`}
            className="rounded-xl border px-4 py-2 text-sm"
          >
            Clear
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap gap-2">
        {q ? (
          <span className="rounded-full border px-3 py-1 text-xs">q: {q}</span>
        ) : null}
        {channel ? (
          <span className="rounded-full border px-3 py-1 text-xs">
            channel: {channel}
          </span>
        ) : null}
        {tag ? (
          <span className="rounded-full border px-3 py-1 text-xs">tag: {tag}</span>
        ) : null}
      </div>

      <section>
        {data.items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            No videos matched your search.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((video: any) => (
              <Link
                key={video.id}
                href={`/${locale}/v/${video.slug}?src=search`}
                className="overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="aspect-video bg-gray-100">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="p-3">
                  <h2 className="line-clamp-2 text-sm font-semibold">
                    {video.title}
                  </h2>

                  {video.tagline ? (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-600">
                      {video.tagline}
                    </p>
                  ) : null}

                  <div className="mt-2 flex flex-wrap gap-1">
                    {video.channels?.slice(0, 2).map((c: any) => (
                      <Link
                        key={c.slug}
                        href={`/${locale}/channels/${c.slug}`}
                        className="rounded-full border px-2 py-0.5 text-[11px] hover:bg-gray-50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {c.name}
                      </Link>
                    ))}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="flex items-center justify-between">
        <div className="text-sm text-gray-600">
          Page {data.pagination.page} of {data.pagination.totalPages}
        </div>

        <div className="flex gap-2">
          {data.pagination.page > 1 ? (
            <Link
              href={`/${locale}/videos?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(channel ? { channel } : {}),
                ...(tag ? { tag } : {}),
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
              href={`/${locale}/videos?${new URLSearchParams({
                ...(q ? { q } : {}),
                ...(channel ? { channel } : {}),
                ...(tag ? { tag } : {}),
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
    </main>
  );
}
