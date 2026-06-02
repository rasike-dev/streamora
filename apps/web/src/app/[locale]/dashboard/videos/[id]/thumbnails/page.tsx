import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { PageFrame, PageHeading } from '@/components/layout';
import { ThumbnailPicker } from '@/components/videos/ThumbnailPicker';

export default async function VideoThumbnailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const tCommon = await getTranslations({ locale, namespace: 'common' });

  return (
    <PageFrame>
      <PageHeading
        title={tCommon('thumbnails')}
        backHref={`/${locale}/dashboard/videos`}
        backLabel={tCommon('myVideos')}
        actions={
          <Link
            href={`/${locale}/dashboard/videos/${id}/edit`}
            className="rounded-xl border border-black/15 px-3 py-2 text-sm hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
          >
            {tCommon('editVideo')}
          </Link>
        }
      />
      <ThumbnailPicker locale={locale} videoId={id} />
    </PageFrame>
  );
}
