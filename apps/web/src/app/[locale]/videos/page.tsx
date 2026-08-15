import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import PublicVideoFilters from "@/components/public-video-filters";
import { getPublicVideos } from "@/lib/api/public-videos";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const surfaceTile =
  "overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]";
const thumbBg = "aspect-video bg-black/5 dark:bg-white/10";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";
const btnMuted =
  "rounded-xl border border-black/15 px-4 py-2 text-sm text-muted-foreground dark:border-white/15";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    q?: string;
    category?: string;
    subcategory?: string;
    channel?: string;
    tag?: string;
    page?: string;
  }>;
};

export default async function VideosPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "videosPage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tErrors = await getTranslations({ locale, namespace: "errors" });

  const q = sp.q ?? "";
  const category = sp.category ?? "";
  const subcategory = sp.subcategory ?? "";
  const channel = sp.channel ?? "";
  const tag = sp.tag ?? "";
  const page = Number(sp.page ?? "1");

  let data: Awaited<ReturnType<typeof getPublicVideos>>;
  let loadError = false;
  try {
    data = await getPublicVideos({
      locale,
      q: q || undefined,
      category: category || undefined,
      subcategory: subcategory || undefined,
      channel: channel || undefined,
      tag: tag || undefined,
      page,
      pageSize: 12,
    });
  } catch {
    loadError = true;
    data = {
      items: [],
      pagination: { page: 1, totalPages: 1, total: 0 },
    };
  }

  const filtered = Boolean(q || category || subcategory || channel || tag);
  const pageParams = {
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(subcategory ? { subcategory } : {}),
    ...(channel ? { channel } : {}),
    ...(tag ? { tag } : {}),
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <PageFrame>
          <PageHeading
            title={t("title")}
            description={t("description")}
            backHref={`/${locale}`}
            backLabel={tCommon("backToHome")}
          />

          {loadError ? (
            <UserBanner
              variant="error"
              title={t("loadError")}
              body={tErrors("network")}
              primaryAction={{
                href: `/${locale}/videos`,
                label: tCommon("retry"),
              }}
              secondaryAction={{
                href: `/${locale}`,
                label: tCommon("home"),
              }}
            />
          ) : null}

          {!loadError ? (
            <>
              <PublicVideoFilters
                locale={locale}
                initial={{ q, category, subcategory, channel, tag }}
              />

              <section className="mt-6">
                {data.items.length === 0 ? (
                  <div className={`${surfaceCard} text-center`}>
                    <p className="text-sm font-medium">
                      {filtered ? t("empty") : t("emptyDefault")}
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {filtered ? t("emptySearch") : t("emptyDefaultHint")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {data.items.map((video: any) => (
                      <article key={video.id} className={surfaceTile}>
                        <Link
                          href={`/${locale}/v/${video.slug}?src=search`}
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
                          </div>
                        </Link>
                        {video.tagline ? (
                          <p className="line-clamp-2 px-3 pb-2 text-xs text-muted-foreground">
                            {video.tagline}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap gap-1 px-3 pb-3">
                          {video.channels?.slice(0, 2).map((c: any) => (
                            <Link
                              key={c.slug}
                              href={`/${locale}/channels/${c.slug}`}
                              className="rounded-full border border-black/10 px-2 py-0.5 text-[11px] hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                            >
                              {c.name}
                            </Link>
                          ))}
                        </div>
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
                      href={`/${locale}/videos?${new URLSearchParams({
                        ...pageParams,
                        page: String(data.pagination.page - 1),
                      }).toString()}`}
                      className={btnGhost}
                    >
                      {t("previous")}
                    </Link>
                  ) : (
                    <span className={btnMuted}>{t("previous")}</span>
                  )}

                  {data.pagination.page < data.pagination.totalPages ? (
                    <Link
                      href={`/${locale}/videos?${new URLSearchParams({
                        ...pageParams,
                        page: String(data.pagination.page + 1),
                      }).toString()}`}
                      className={btnGhost}
                    >
                      {t("next")}
                    </Link>
                  ) : (
                    <span className={btnMuted}>{t("next")}</span>
                  )}
                </div>
              </section>
            </>
          ) : null}
        </PageFrame>
      </main>
    </div>
  );
}
