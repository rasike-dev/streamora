import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getPublicEmbedVideo } from '@/lib/api/public-embed';
import { PublicVideoPlayer } from '@/components/videos/PublicVideoPlayer';

type PageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  try {
    const video = await getPublicEmbedVideo({
      slug: resolvedParams.slug,
      locale: resolvedParams.locale,
    });

    return {
      title: `${video.title} | Streamora`,
      description: video.tagline || video.description || '',
      robots: {
        index: false,
        follow: false,
      },
      alternates: {
        canonical: video.canonicalUrl,
      },
    };
  } catch {
    return {
      title: 'Video | Streamora',
      robots: {
        index: false,
        follow: false,
      },
    };
  }
}

// Headers are set via Next.js route segment config
export const dynamic = 'force-dynamic';

export default async function EmbedVideoPage(props: PageProps) {
  const params = await props.params;

  let video;
  try {
    video = await getPublicEmbedVideo({
      slug: params.slug,
      locale: params.locale,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'EMBED_VIDEO_NOT_FOUND') {
      notFound();
    }
    throw error;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl">
        <div className="aspect-video w-full bg-black">
          <PublicVideoPlayer
            videoId={video.id}
            playbackUrl={video.hlsUrl}
            posterUrl={video.thumbnailUrl}
            locale={params.locale}
            trafficSource="EXTERNAL"
            subtitles={video.subtitles || []}
          />
        </div>

        <div className="space-y-2 px-4 py-3 bg-neutral-950">
          <h1 className="text-sm md:text-base font-semibold line-clamp-2">
            {video.title}
          </h1>

          {video.tagline ? (
            <p className="text-xs text-neutral-300 line-clamp-2">
              {video.tagline}
            </p>
          ) : null}

          <div className="flex items-center justify-between gap-3 text-xs text-neutral-400">
            <div>
              {video.uploader ? `By ${video.uploader.displayName}` : 'Streamora'}
            </div>

            <Link
              href={video.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-white"
            >
              Watch on Streamora
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
