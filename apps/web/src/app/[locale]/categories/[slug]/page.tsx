import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { getCategoryBySlug } from "@/lib/api/public-taxonomy";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;

  try {
    const category = await getCategoryBySlug(slug, locale);
    const title = `${category.name} | Streamora`;

    return {
      title,
      description: category.description ?? undefined,
      openGraph: { title, description: category.description ?? undefined },
    };
  } catch {
    return { title: "Category not found | Streamora" };
  }
}

export default async function CategoryPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "categoryPage" });
  const tTaxonomy = await getTranslations({ locale, namespace: "taxonomy" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  let category: Awaited<ReturnType<typeof getCategoryBySlug>>;
  try {
    category = await getCategoryBySlug(slug, locale);
  } catch {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <PageFrame>
            <PageHeading
              title={t("notFound")}
              backHref={`/${locale}/categories`}
              backLabel={t("backToCategories")}
            />
            <UserBanner
              variant="warning"
              title={t("notFound")}
              primaryAction={{
                href: `/${locale}/categories`,
                label: t("backToCategories"),
              }}
              secondaryAction={{ href: `/${locale}`, label: tCommon("home") }}
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
            title={category.name}
            description={category.description || undefined}
            backHref={`/${locale}/categories`}
            backLabel={t("backToCategories")}
          />

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("subcategories")}
            </h2>

            {category.subcategories.length === 0 ? (
              <div className={`${surfaceCard} text-sm text-muted-foreground`}>
                {t("empty")}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {category.subcategories.map((subcategory) => (
                  <article key={subcategory.id} className={surfaceCard}>
                    <h3 className="text-base font-semibold">
                      <Link
                        href={`/${locale}/categories/${category.slug}/${subcategory.slug}`}
                        className="hover:underline"
                      >
                        {subcategory.name}
                      </Link>
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground">
                      {tTaxonomy("videoCount", {
                        count: subcategory.videoCount ?? 0,
                      })}
                    </p>

                    <ul className="mt-3 flex flex-wrap gap-2">
                      {subcategory.channels.map((channel) => (
                        <li key={channel.id}>
                          <Link
                            href={`/${locale}/channels/${channel.slug}`}
                            className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                          >
                            {channel.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="mt-8">
            <Link
              href={`/${locale}/videos?category=${category.slug}`}
              className="rounded-xl border border-black/15 px-4 py-2 text-sm font-medium hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              {tCommon("browseVideos")}
            </Link>
          </div>
        </PageFrame>
      </main>
    </div>
  );
}
