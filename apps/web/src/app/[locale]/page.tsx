import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { brand, logoAssets } from "@/lib/brand";

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
  const ogImage = `${appUrl.replace(/\/$/, "")}${logoAssets.horizontal.src}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: brand.name,
      type: "website",
      locale,
      images: [{ url: ogImage, width: logoAssets.horizontal.width, height: logoAssets.horizontal.height, alt: brand.name }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
  };
}

export default async function HomePage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "landing" });
  const contactEmail =
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || `hello@${brand.domain}`;

  const featureBlocks = [
    ["feature1Title", "feature1Body"],
    ["feature2Title", "feature2Body"],
    ["feature3Title", "feature3Body"],
  ] as const;

  const steps = [
    ["step1Title", "step1Body"],
    ["step2Title", "step2Body"],
    ["step3Title", "step3Body"],
    ["step4Title", "step4Body"],
  ] as const;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-10 sm:py-16">
        <section className="mx-auto w-full max-w-3xl text-center">
          <BrandLogo variant="hero" priority className="mb-8 sm:mb-10" />
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
              href={`/${locale}/sign-in`}
              className="inline-flex w-full min-w-[12rem] items-center justify-center rounded-xl border border-black/15 px-6 py-3 text-sm font-medium transition hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06] sm:w-auto"
            >
              {t("ctaCreatorLogin")}
            </Link>
          </div>
        </section>

        <section className="mt-20 border-t border-black/10 pt-16 dark:border-white/10">
          <h2 className="text-center text-lg font-semibold">{t("howItWorksTitle")}</h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
            {steps.map(([titleKey, bodyKey], index) => (
              <li
                key={titleKey}
                className="rounded-2xl border border-black/10 p-6 dark:border-white/10"
              >
                <span className="text-xs font-medium text-muted-foreground">
                  {t("stepLabel", { number: index + 1 })}
                </span>
                <h3 className="mt-2 font-medium">{t(titleKey)}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{t(bodyKey)}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-20 border-t border-black/10 pt-16 dark:border-white/10">
          <h2 className="text-center text-lg font-semibold">{t("featuresTitle")}</h2>
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

        <section className="mx-auto mt-20 max-w-2xl rounded-2xl border border-black/10 bg-black/[0.02] p-8 text-center dark:border-white/10 dark:bg-white/[0.03]">
          <h2 className="text-lg font-semibold">{t("contactTitle")}</h2>
          <p className="mt-3 text-sm text-muted-foreground">{t("contactBody")}</p>
          <a
            href={`mailto:${contactEmail}?subject=${encodeURIComponent(t("contactSubject"))}`}
            className="mt-6 inline-flex items-center justify-center rounded-xl bg-foreground px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
          >
            {t("contactCta")}
          </a>
        </section>
      </main>

      <SiteFooter locale={locale} />
    </div>
  );
}
