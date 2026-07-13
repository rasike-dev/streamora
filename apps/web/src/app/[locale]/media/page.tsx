import Link from "next/link";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { fetchPublicMediaList } from "@/lib/api/public-media";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";
const surfaceTile =
  "overflow-hidden rounded-2xl border border-black/10 bg-black/[0.02] shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/[0.04]";
const thumbBg = "aspect-[4/3] bg-black/5 dark:bg-white/10";
const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
};

export default async function MediaBrowsePage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || "1") || 1);
  const t = await getTranslations({ locale, namespace: "mediaBrowsePage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tErrors = await getTranslations({ locale, namespace: "errors" });

  let data = { items: [] as any[], page: 1, pageSize: 24, total: 0 };
  let loadError = false;

  try {
    data = await fetchPublicMediaList(locale, page);
  } catch {
    loadError = true;
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

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
                href: `/${locale}/media`,
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
              <section className="mt-2">
                {data.items.length === 0 ? (
                  <div className={`${surfaceCard} text-center`}>
                    <p className="text-sm font-medium">{t("empty")}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {t("emptyHint")}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                    {data.items.map((item: any) => (
                      <article key={item.id} className={surfaceTile}>
                        <Link
                          href={`/${locale}/m/${item.slug}`}
                          className="block"
                        >
                          <div className={thumbBg}>
                            {item.thumbnailUrl || item.previewUrl ? (
                              <Image
                                src={item.thumbnailUrl || item.previewUrl}
                                alt={item.title}
                                width={400}
                                height={300}
                                unoptimized
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full min-h-32 items-center justify-center text-xs text-muted-foreground">
                                {item.kind}
                              </div>
                            )}
                          </div>
                          <div className="p-3">
                            <h2 className="line-clamp-2 text-sm font-medium">
                              {item.title}
                            </h2>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {item.kind} · {item.views} {t("views")}
                            </p>
                          </div>
                        </Link>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              {totalPages > 1 ? (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    {t("pageOf", { page, total: totalPages })}
                  </p>
                  <div className="flex gap-2">
                    {page > 1 ? (
                      <Link
                        href={`/${locale}/media?page=${page - 1}`}
                        className={btnGhost}
                      >
                        {t("previous")}
                      </Link>
                    ) : null}
                    {page < totalPages ? (
                      <Link
                        href={`/${locale}/media?page=${page + 1}`}
                        className={btnGhost}
                      >
                        {t("next")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </>
          ) : null}
        </PageFrame>
      </main>
    </div>
  );
}
