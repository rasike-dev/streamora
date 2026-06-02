import { getTranslations } from 'next-intl/server';
import { PageFrame, PageHeading } from '@/components/layout';
import { BulkUploadManager } from '@/components/uploads/BulkUploadManager';

export default async function UploadsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'dashboardUploads' });
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <PageFrame>
      <PageHeading
        title={t('title')}
        description={t('description')}
        backHref={`/${locale}/dashboard`}
        backLabel={tCommon('backToDashboard')}
      />
      <div className="mx-auto max-w-3xl">
        <BulkUploadManager locale={locale} />
      </div>
    </PageFrame>
  );
}
