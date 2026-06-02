import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { getPublicTagBySlug } from "@/lib/api/public-tags";

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

  const t = await getTranslations({ locale, namespace: "tagPage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tVideos = await getTranslations({ locale, namespace: "videosPage" });
  const tErrors = await getTranslations({ locale, namespace: "errors" });

  let data: Awaited<ReturnType<typeof getPublicTagBySlug>>;
  try {
    data = await getPublicTagBySlug(slug, locale, currentPage, 12);
  } catch (error) {
    if (error instanceof Error && error.message === "TAG_NOT_FOUND") {
      notFound();
    }

    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <PageFrame>
            <PageHeading
              title={t("loadError")}
              backHref={`/${locale}/videos`}
              backLabel={tVideos("title")}
            />
            <UserBanner
              variant="error"
              title={t("loadError")}
              body={tErrors("network")}
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
          <PageHeading
            title={data.tag.name}
            description={data.tag.description || undefined}
            backHref={`/${locale}/videos`}
            backLabel={tVideos("title")}
          />

          <p className="-mt-4 mb-8 text-sm text-muted-foreground">
            {t("videoCount", { count: data.pagination.total })}
          </p>

          <section>
            {data.items.length === 0 ? (
              <div className={`${surfaceCard} space-y-2 text-muted-foreground`}>
                <h2 className="text-lg font-medium text-foreground">
                  {t("emptyTitle")}
                </h2>
                <p className="text-sm">{t("emptyBody")}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {data.items.map((video: any) => (
                  <article key={video.id} className={surfaceTile}>
                    <Link
                      href={`/${locale}/v/${video.slug}?src=tag`}
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
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {video.channel ? (
                            <span>{video.channel.name}</span>
                          ) : null}
                          {video.uploader ? (
                            <span>• {video.uploader.displayName}</span>
                          ) : null}
                        </div>
                      </div>
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </section>

          {data.pagination.totalPages > 1 ? (
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
                    href={`/${locale}/tags/${slug}?page=${data.pagination.page - 1}`}
                    className={btnGhost}
                  >
                    {t("previous")}
                  </Link>
                ) : (
                  <span className={btnMuted}>{t("previous")}</span>
                )}

                {data.pagination.page < data.pagination.totalPages ? (
                  <Link
                    href={`/${locale}/tags/${slug}?page=${data.pagination.page + 1}`}
                    className={btnGhost}
                  >
                    {t("next")}
                  </Link>
                ) : (
                  <span className={btnMuted}>{t("next")}</span>
                )}
              </div>
            </section>
          ) : null}
        </PageFrame>
      </main>
    </div>
  );
}
