export type PublicEmbedVideo = {
  id: string;
  slug: string;
  sourceType?: 'UPLOAD' | 'EXTERNAL_EMBED';
  title: string;
  description: string | null;
  tagline: string | null;
  hlsUrl?: string;
  externalEmbed?: {
    provider: string;
    embedUrl: string;
    canonicalUrl: string;
    embedWidth?: number | null;
    embedHeight?: number | null;
    validationStatus: string;
  } | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  uploader: {
    displayName: string;
  } | null;
  canonicalUrl: string;
  embedUrl: string;
  subtitles?: Array<{ locale: string; url: string }>;
};

export async function getPublicEmbedVideo(params: {
  slug: string;
  locale: string;
}): Promise<PublicEmbedVideo> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const qs = new URLSearchParams({
    locale: params.locale,
  });

  const res = await fetch(
    `${api}/public/videos/${params.slug}/embed?${qs.toString()}`,
    {
      cache: 'no-store',
    },
  );

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error('EMBED_VIDEO_NOT_FOUND');
    }
    throw new Error('Failed to load embed video');
  }

  return res.json();
}
