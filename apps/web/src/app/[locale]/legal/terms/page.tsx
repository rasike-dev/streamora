import { getTranslations } from "next-intl/server";

type PageProps = { params: Promise<{ locale: string }> };

export default async function TermsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "legal" });

  const sections = ["s1", "s2", "s3", "s4", "s5"] as const;

  return (
    <article className="prose prose-neutral max-w-none dark:prose-invert">
      <h1>{t("termsTitle")}</h1>
      <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
      {sections.map((key) => (
        <section key={key}>
          <h2>{t(`terms.${key}Title`)}</h2>
          <p>{t(`terms.${key}Body`)}</p>
        </section>
      ))}
    </article>
  );
}
