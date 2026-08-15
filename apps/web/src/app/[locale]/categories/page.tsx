import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading, UserBanner } from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
import { getCategories } from "@/lib/api/public-taxonomy";

const surfaceCard =
  "rounded-2xl border border-black/10 bg-black/[0.02] p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04]";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categoryPage" });

  return {
    title: `${t("title")} | Streamora`,
    description: t("description"),
  };
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "categoryPage" });
  const tTaxonomy = await getTranslations({ locale, namespace: "taxonomy" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tErrors = await getTranslations({ locale, namespace: "errors" });

  let categories: Awaited<ReturnType<typeof getCategories>> = [];
  let loadError = false;
  try {
    categories = await getCategories(locale);
  } catch {
    loadError = true;
  }

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
              title={t("notFound")}
              body={tErrors("network")}
              primaryAction={{
                href: `/${locale}/categories`,
                label: tCommon("retry"),
              }}
              secondaryAction={{ href: `/${locale}`, label: tCommon("home") }}
            />
          ) : categories.length === 0 ? (
            <div className={`${surfaceCard} text-sm text-muted-foreground`}>
              {t("empty")}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {categories.map((category) => (
                <article key={category.id} className={surfaceCard}>
                  <h2 className="text-base font-semibold">
                    <Link
                      href={`/${locale}/categories/${category.slug}`}
                      className="hover:underline"
                    >
                      {category.name}
                    </Link>
                  </h2>

                  {category.description ? (
                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  ) : null}

                  <ul className="mt-3 flex flex-wrap gap-2">
                    {category.subcategories.slice(0, 6).map((subcategory) => (
                      <li key={subcategory.id}>
                        <Link
                          href={`/${locale}/categories/${category.slug}/${subcategory.slug}`}
                          className="rounded-full border border-black/10 px-3 py-1 text-xs hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                        >
                          {subcategory.name}
                        </Link>
                      </li>
                    ))}
                  </ul>

                  <p className="mt-3 text-xs text-muted-foreground">
                    {tTaxonomy("subcategories")}: {category.subcategories.length}
                  </p>
                </article>
              ))}
            </div>
          )}
        </PageFrame>
      </main>
    </div>
  );
}
