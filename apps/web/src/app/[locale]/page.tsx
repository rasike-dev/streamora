import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  const title = t("metaTitle");
  const description = t("metaDescription");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const canonical = `${appUrl.replace(/\/$/, "")}/${locale}`;

  return {
    title,
    description,
    alternates: {
      canonical,
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Streamora",
      type: "website",
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  const year = new Date().getFullYear();

  const featureBlocks = [
    ["feature1Title", "feature1Body"],
    ["feature2Title", "feature2Body"],
    ["feature3Title", "feature3Body"],
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-12 sm:py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
            {t("heroTitle")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg">
            {t("heroSubtitle")}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={`/${locale}/videos`}
              className="inline-flex w-full min-w-[12rem] items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90 sm:w-auto"
            >
              {t("ctaBrowse")}
            </Link>
            <Link
              href={`/${locale}/login`}
              className="inline-flex w-full min-w-[12rem] items-center justify-center rounded-xl border border-black/15 px-6 py-3 text-sm font-medium transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06] sm:w-auto"
            >
              {t("ctaCreatorLogin")}
            </Link>
          </div>
        </section>

        <section className="mt-20 border-t border-black/10 pt-16 dark:border-white/10">
          <h2 className="text-center text-lg font-semibold">
            {t("featuresTitle")}
          </h2>
          <ul className="mt-10 grid gap-8 sm:grid-cols-3">
            {featureBlocks.map(([titleKey, bodyKey]) => (
              <li
                key={titleKey}
                className="rounded-2xl border border-black/10 p-6 dark:border-white/10"
              >
                <h3 className="font-medium">{t(titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(bodyKey)}</p>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-black/10 py-8 dark:border-white/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 sm:flex-row sm:items-center sm:justify-between">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link
              href={`/${locale}/videos`}
              className="transition hover:text-foreground"
            >
              {t("footerBrowse")}
            </Link>
            <Link
              href={`/${locale}/upload`}
              className="transition hover:text-foreground"
            >
              {t("footerUpload")}
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="transition hover:text-foreground"
            >
              {t("footerDashboard")}
            </Link>
            <Link
              href={`/${locale}/admin`}
              className="transition hover:text-foreground"
            >
              {t("footerAdmin")}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            {t("footerCopyright", { year })}
          </p>
        </div>
      </footer>
    </div>
  );
}
