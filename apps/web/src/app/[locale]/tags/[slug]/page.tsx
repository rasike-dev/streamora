import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicTagBySlug } from "@/lib/api/public-tags";

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams: Promise<{
    page?: string;
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const data = await getPublicTagBySlug(
      resolvedParams.slug,
      resolvedParams.locale,
      1,
      12,
    );
    const title = `${data.tag.name} Videos | Streamora`;
    const description =
      data.tag.description ||
      `Watch videos tagged with ${data.tag.name} on Streamora.`;

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
      title: "Tag | Streamora",
    };
  }
}

export default async function TagLandingPage(props: PageProps) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { locale, slug } = params;
  const currentPage = Number(searchParams.page || "1");

  let data: any;
  try {
    data = await getPublicTagBySlug(slug, locale, currentPage, 12);
  } catch (error) {
    if (error instanceof Error && error.message === "TAG_NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <main className="mx-auto max-w-6xl p-4 space-y-6">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-sm text-gray-500">Tag</p>
        <h1 className="mt-1 text-2xl font-semibold">{data.tag.name}</h1>
        {data.tag.description ? (
          <p className="mt-2 max-w-2xl text-sm text-gray-600">
            {data.tag.description}
          </p>
        ) : null}
        <p className="mt-3 text-sm text-gray-500">
          {data.pagination.total} public video
          {data.pagination.total === 1 ? "" : "s"}
        </p>
      </section>

      <section>
        {data.items.length === 0 ? (
          <div className="rounded-2xl border bg-white p-6 text-sm text-gray-600 shadow-sm">
            <h2 className="text-lg font-medium mb-2">No videos yet</h2>
            <p>
              This tag exists, but there are no public videos available right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {data.items.map((video: any) => (
              <Link
                key={video.id}
                href={`/${locale}/v/${video.slug}?src=tag`}
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

                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                    {video.channel ? <span>{video.channel.name}</span> : null}
                    {video.uploader ? (
                      <span>• {video.uploader.displayName}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {data.pagination.totalPages > 1 ? (
        <section className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Page {data.pagination.page} of {data.pagination.totalPages}
          </div>

          <div className="flex gap-2">
            {data.pagination.page > 1 ? (
              <Link
                href={`/${locale}/tags/${slug}?page=${data.pagination.page - 1}`}
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
                href={`/${locale}/tags/${slug}?page=${data.pagination.page + 1}`}
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
      ) : null}
    </main>
  );
}
