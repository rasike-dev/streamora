import { getTranslations } from 'next-intl/server';
import { PageFrame, PageHeading } from '@/components/layout';
import { UploadManager } from '@/components/upload-manager';

type PageProps = {
  params: Promise<{ locale: string }>;
};

export default async function UploadPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'uploadPage' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <PageFrame>
      <PageHeading
        title={t('title')}
        description={t('description')}
        backHref={`/${locale}/dashboard`}
        backLabel={tCommon('backToDashboard')}
      />
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">{t('intro')}</p>
      <UploadManager locale={locale} />
    </PageFrame>
  );
}
