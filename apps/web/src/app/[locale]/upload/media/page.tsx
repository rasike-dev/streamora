import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { PageFrame, PageHeading } from "@/components/layout";
import { MediaUploadManager } from "@/components/media-upload-manager";

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function MediaUploadPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "mediaUploadPage" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  return (
    <PageFrame>
      <PageHeading
        title={t("title")}
        description={t("description")}
        backHref={`/${locale}/dashboard`}
        backLabel={tCommon("backToDashboard")}
      />
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">{t("intro")}</p>
      <div className="mb-6 rounded-2xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
        <p className="text-muted-foreground">{t("alsoUploadVideo")}</p>
        <Link
          href={`/${locale}/upload`}
          className="mt-2 inline-flex font-medium underline underline-offset-2"
        >
          {t("uploadVideoLink")}
        </Link>
      </div>
      <MediaUploadManager locale={locale} />
    </PageFrame>
  );
}
