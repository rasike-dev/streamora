import { getTranslations } from 'next-intl/server';
import { PageFrame, PageHeading } from '@/components/layout';
import { WatchPlayer } from './watch-player';

type PageProps = {
  params: Promise<{ locale: string; videoId: string }>;
};

export default async function WatchPage({ params }: PageProps) {
  const { locale, videoId } = await params;
  const t = await getTranslations({ locale, namespace: 'watchPage' });

  return (
    <PageFrame>
      <PageHeading
        title={t('title')}
        backHref={`/${locale}/videos`}
        backLabel={t('backVideos')}
      />
      <WatchPlayer videoId={videoId} />
    </PageFrame>
  );
}
