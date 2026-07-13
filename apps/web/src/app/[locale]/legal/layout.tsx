import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SiteHeader } from "@/components/layout/site-header";

type PageProps = {
  params: Promise<{ locale: string }>;
  children: React.ReactNode;
};

export default async function LegalLayout({ params, children }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <nav className="mb-8 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <Link href={`/${locale}/legal/terms`} className="hover:text-foreground">
            {t("termsNav")}
          </Link>
          <Link href={`/${locale}/legal/privacy`} className="hover:text-foreground">
            {t("privacyNav")}
          </Link>
          <Link href={`/${locale}/legal/cookies`} className="hover:text-foreground">
            {t("cookiesNav")}
          </Link>
        </nav>
        {children}
      </main>
    </div>
  );
}
