import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BrandLogo } from "@/components/layout/brand-logo";
import { brand } from "@/lib/brand";

export async function SiteFooter({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-black/10 py-8 dark:border-white/10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 lg:flex-row lg:items-start lg:justify-between">
        <BrandLogo variant="footer" />

        <div className="flex flex-col gap-6 sm:items-end lg:items-end">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link
              href={`/${locale}/videos`}
              className="transition hover:text-foreground"
            >
              {t("footerBrowse")}
            </Link>
            <Link
              href={`/${locale}/sign-in`}
              className="transition hover:text-foreground"
            >
              {t("footerLogin")}
            </Link>
            <Link
              href={`/${locale}/legal/terms`}
              className="transition hover:text-foreground"
            >
              {t("footerTerms")}
            </Link>
            <Link
              href={`/${locale}/legal/privacy`}
              className="transition hover:text-foreground"
            >
              {t("footerPrivacy")}
            </Link>
          </nav>
          <p className="text-xs text-muted-foreground">
            {t("footerCopyright", { year, brand: brand.name })}
          </p>
        </div>
      </div>
    </footer>
  );
}
