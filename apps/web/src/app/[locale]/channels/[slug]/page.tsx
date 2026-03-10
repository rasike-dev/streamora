import type { Metadata } from "next";
import Link from "next/link";
import { getPublicChannelBySlug } from "@/lib/api/public-channels";

type PageProps = {
  params: { locale: string; slug: string };
  searchParams: { page?: string };
};

export async function generateMetadata({
  params,
}: {
  params: { locale: string; slug: string };
}): Promise<Metadata> {
  try {
    const data = await getPublicChannelBySlug(params.slug, params.locale, 1, 12);
    const title = `${data.channel.name} | Streamora`;
    const description =
      data.channel.description ??
      `Browse videos in the ${data.channel.name} channel on Streamora.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch {
    return {
      title: "Channel not found | Streamora",
    };
  }
}

export default async function ChannelPage({ params, searchParams }: PageProps) {
  const { locale, slug } = params;
  const currentPage = Number(searchParams.page || "1");

  let data: any;
  try {
    data = await getPublicChannelBySlug(slug, locale, currentPage, 12);
  } catch {
    return (
      <main className="mx-auto max-w-6xl p-4">
        <h1 className="text-xl font-semibold">Channel not found</h1>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Channel</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.channel.name}</h1>
        {data.channel.description ? (
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            {data.channel.description}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-gray-500">
          {data.pagination.total} video
          {data.pagination.total === 1 ? "" : "s"}
        </p>
      </section>

      <section>
        {data.items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            No videos found in this channel yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((video: any) => (
              <Link
                key={video.id}
                href={`/${locale}/v/${video.slug}?src=channel`}
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

                  <div className="mt-2 flex flex-col gap-1 text-xs text-gray-500">
                    {video.uploaderName ? <span>{video.uploaderName}</span> : null}
                    {video.publishedAt ? (
                      <span>
                        {new Date(video.publishedAt).toLocaleDateString()}
                      </span>
                    ) : null}
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
              href={`/${locale}/channels/${slug}?page=${data.pagination.page - 1}`}
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
              href={`/${locale}/channels/${slug}?page=${data.pagination.page + 1}`}
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