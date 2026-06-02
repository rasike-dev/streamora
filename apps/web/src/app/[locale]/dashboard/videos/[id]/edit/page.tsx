import { getTranslations } from 'next-intl/server';
import { PageFrame, PageHeading } from '@/components/layout';
import VideoDraftEditor from '@/components/video-draft-editor';

export default async function EditVideoPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <PageFrame>
      <PageHeading
        title={tCommon('editVideo')}
        backHref={`/${locale}/dashboard/videos`}
        backLabel={tCommon('myVideos')}
      />
      <VideoDraftEditor videoId={id} locale={locale} />
    </PageFrame>
  );
}
