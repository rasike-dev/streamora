import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { getSubcategoryBySlug } from "@/lib/api/public-taxonomy";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";

type PageProps = {
  params: Promise<{ locale: string; slug: string; subSlug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug, subSlug } = await params;

  try {
    const subcategory = await getSubcategoryBySlug(slug, subSlug, locale);
    const title = `${subcategory.name} | ${subcategory.category.name} | Streamora`;

    return {
      title,
      description: subcategory.description ?? undefined,
      openGraph: { title, description: subcategory.description ?? undefined },
    };
  } catch {
    return { title: "Subcategory not found | Streamora" };
  }
}

export default async function SubcategoryPage({ params }: PageProps) {
  const { locale, slug, subSlug } = await params;
  const t = await getTranslations({ locale, namespace: "subcategoryPage" });
  const tCategory = await getTranslations({ locale, namespace: "categoryPage" });
  const tTaxonomy = await getTranslations({ locale, namespace: "taxonomy" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  let subcategory: Awaited<ReturnType<typeof getSubcategoryBySlug>>;
  try {
    subcategory = await getSubcategoryBySlug(slug, subSlug, locale);
  } catch {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <PageFrame>
            <PageHeading
              title={t("notFound")}
              backHref={`/${locale}/categories/${slug}`}
              backLabel={tCategory("backToCategories")}
            />
            <UserBanner
              variant="warning"
              title={t("notFound")}
              primaryAction={{
                href: `/${locale}/categories`,
                label: tCategory("backToCategories"),
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
          <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            <Link href={`/${locale}/categories`} className="hover:underline">
              {tTaxonomy("categories")}
            </Link>
            <span>/</span>
            <Link
              href={`/${locale}/categories/${subcategory.category.slug}`}
              className="hover:underline"
            >
              {subcategory.category.name}
            </Link>
            <span>/</span>
            <span className="text-foreground">{subcategory.name}</span>
          </nav>

          <PageHeading
            title={subcategory.name}
            description={subcategory.description || undefined}
            backHref={`/${locale}/categories/${subcategory.category.slug}`}
            backLabel={subcategory.category.name}
          />

          <section className="space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("channels")}
            </h2>

            {subcategory.channels.length === 0 ? (
              <div className={`${surfaceCard} text-sm text-muted-foreground`}>
                {t("empty")}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subcategory.channels.map((channel) => (
                  <article key={channel.id} className={surfaceCard}>
                    <h3 className="text-base font-semibold">
                      <Link
                        href={`/${locale}/channels/${channel.slug}`}
                        className="hover:underline"
                      >
                        {channel.name}
                      </Link>
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tTaxonomy("videoCount", { count: channel.videoCount ?? 0 })}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="mt-8">
            <Link
              href={`/${locale}/videos?category=${subcategory.category.slug}&subcategory=${subcategory.slug}`}
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
