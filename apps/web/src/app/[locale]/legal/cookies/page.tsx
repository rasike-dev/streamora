import { getTranslations } from "next-intl/server";

type PageProps = { params: Promise<{ locale: string }> };

export default async function CookiesPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      <h1>{t("cookiesTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
      <p>{t("cookiesIntro")}</p>
      <h2>{t("cookies.sessionTitle")}</h2>
      <p>{t("cookies.sessionBody")}</p>
      <h2>{t("cookies.analyticsTitle")}</h2>
      <p>{t("cookies.analyticsBody")}</p>
    </article>
  );
}
