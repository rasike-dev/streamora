import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicChannelBySlug } from "@/lib/api/public-channels";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const surfaceTile =
  "overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]";
const thumbBg = "aspect-video bg-black/5 dark:bg-white/10";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";
const btnMuted =
  "rounded-xl border border-black/15 px-4 py-2 text-sm text-muted-foreground dark:border-white/15";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ page?: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  try {
    const data = await getPublicChannelBySlug(slug, locale, 1, 12);
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

export default async function ChannelPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;
  const { page: pageStr } = await searchParams;
  const currentPage = Number(pageStr || "1");

  const t = await getTranslations({ locale, namespace: "channelPage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tVideos = await getTranslations({ locale, namespace: "videosPage" });
  const tTaxonomy = await getTranslations({ locale, namespace: "taxonomy" });

  let data: Awaited<ReturnType<typeof getPublicChannelBySlug>>;
  try {
    data = await getPublicChannelBySlug(slug, locale, currentPage, 12);
  } catch {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <PageFrame>
            <PageHeading
              title={t("notFoundTitle")}
              backHref={`/${locale}/videos`}
              backLabel={tCommon("browseVideos")}
            />
            <UserBanner
              variant="warning"
              title={t("loadError")}
              primaryAction={{
                href: `/${locale}/videos`,
                label: tCommon("browseVideos"),
              }}
              secondaryAction={{
                href: `/${locale}`,
                label: tCommon("home"),
              }}
            />
          </PageFrame>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <PageFrame>
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link href={`/${locale}/categories`} className="hover:underline">
              {tTaxonomy("categories")}
            </Link>
            {data.breadcrumb?.category && data.breadcrumb?.subcategory ? (
              <>
                <span>/</span>
                <Link
                  href={`/${locale}/categories/${data.breadcrumb.category.slug}`}
                  className="hover:underline"
                >
                  {data.breadcrumb.category.name}
                </Link>
                <span>/</span>
                <Link
                  href={`/${locale}/categories/${data.breadcrumb.category.slug}/${data.breadcrumb.subcategory.slug}`}
                  className="hover:underline"
                >
                  {data.breadcrumb.subcategory.name}
                </Link>
              </>
            ) : (
              <>
                <span>/</span>
                <span>{tTaxonomy("unclassified")}</span>
              </>
            )}
            <span>/</span>
            <span className="text-foreground">{data.channel.name}</span>
          </nav>

          <PageHeading
            title={data.channel.name}
            description={data.channel.description || undefined}
            backHref={`/${locale}/videos`}
            backLabel={tVideos("title")}
          />

          <p className="-mt-4 mb-8 text-sm text-muted-foreground">
            {t("videoCount", { count: data.pagination.total })}
          </p>

          <section>
            {data.items.length === 0 ? (
              <div className={`${surfaceCard} text-sm text-muted-foreground`}>
                {t("empty")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.items.map((video: any) => (
                  <article key={video.id} className={surfaceTile}>
                    <Link
                      href={`/${locale}/v/${video.slug}?src=channel`}
                      className="block"
                    >
                      <div className={thumbBg}>
                        {video.thumbnailUrl ? (
                          <Image
                            src={video.thumbnailUrl}
                            alt={video.title}
                            width={640}
                            height={360}
                            unoptimized
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="p-3">
                        <h2 className="line-clamp-2 text-sm font-semibold">
                          {video.title}
                        </h2>
                        {video.tagline ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {video.tagline}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground">
                          {video.uploaderName ? (
                            <span>{video.uploaderName}</span>
                          ) : null}
                          {video.publishedAt ? (
                            <span>
                              {new Date(video.publishedAt).toLocaleDateString()}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              {t("pageOf", {
                page: data.pagination.page,
                total: data.pagination.totalPages,
              })}
            </div>

            <div className="flex gap-2">
              {data.pagination.page > 1 ? (
                <Link
                  href={`/${locale}/channels/${slug}?page=${data.pagination.page - 1}`}
                  className={btnGhost}
                >
                  {t("previous")}
                </Link>
              ) : (
                <span className={btnMuted}>{t("previous")}</span>
              )}

              {data.pagination.page < data.pagination.totalPages ? (
                <Link
                  href={`/${locale}/channels/${slug}?page=${data.pagination.page + 1}`}
                  className={btnGhost}
                >
                  {t("next")}
                </Link>
              ) : (
                <span className={btnMuted}>{t("next")}</span>
              )}
            </div>
          </section>
        </PageFrame>
      </main>
    </div>
  );
}
