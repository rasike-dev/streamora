import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading } from "@/components/layout";
import { ExternalEmbedForm } from "@/components/external-embed-form";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function ExternalUploadPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "externalUploadPage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <PageFrame>
      <PageHeading
        title={t("title")}
        description={t("description")}
        backHref={`/${locale}/upload`}
        backLabel={tCommon("back")}
      />
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">{t("intro")}</p>
      <ExternalEmbedForm locale={locale} />
      <p className="mt-6 text-sm text-muted-foreground">
        {t("alsoUploadFile")}{" "}
        <Link href={`/${locale}/upload`} className="underline underline-offset-2">
          {t("uploadFileLink")}
        </Link>
      </p>
    </PageFrame>
  );
}
