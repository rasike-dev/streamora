import type { Metadata } from "next";
import Link from "next/link";
import { PublicVideoPlayer } from "@/components/videos/PublicVideoPlayer";
import ShareActions from "@/components/share-actions";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ src?: string }>;
};

async function getVideo(locale: string, slug: string) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const res = await fetch(`${api}/public/videos/${slug}?locale=${locale}`, {
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const video = await getVideo(locale, slug);

  if (!video) {
    return {
      title: "Video not found | Streamora",
    };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pageUrl = `${appUrl}/${locale}/v/${video.slug}`;
  const title = video.title || "Streamora Video";
  const description = video.description || video.tagline || "Watch on Streamora";
  const image = video.thumbnailUrl || `${appUrl}/og-default.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: pageUrl,
    },
    openGraph: {
      title,
      description,
      url: pageUrl,
      siteName: "Streamora",
      images: image ? [{ url: image }] : [],
      type: "video.other",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : [],
    },
  };
}

export default async function VideoSharePage({ params, searchParams }: PageProps) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const video = await getVideo(locale, slug);

  if (!video) {
    return (
      <main className="min-h-dvh p-4">
        <h1 className="text-xl font-semibold">Video not found</h1>
      </main>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl}/${locale}/v/${video.slug}`;

  // Determine traffic source from URL param or default
  const src = sp.src;
  const trafficSource =
    src === "search"
      ? "SEARCH"
      : src === "channel"
      ? "CHANNEL"
      : src === "tag"
      ? "TAG"
      : src === "share"
      ? "SHARE"
      : "DIRECT";

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">{video.title || "Untitled video"}</h1>

        {video.tagline && (
          <p className="text-sm text-muted-foreground">{video.tagline}</p>
        )}

        {video.uploader && (
          <p className="text-xs text-muted-foreground">By {video.uploader}</p>
        )}
      </div>

      <PublicVideoPlayer
        videoId={video.id}
        playbackUrl={video.playbackUrl}
        posterUrl={video.thumbnailUrl}
        locale={locale}
        trafficSource={trafficSource as any}
        subtitles={video.subtitles || []}
      />

      {video.description && (
        <div className="rounded-xl border p-4">
          <h2 className="text-sm font-medium mb-2">Description</h2>
          <p className="text-sm whitespace-pre-wrap">{video.description}</p>
        </div>
      )}

      <ShareActions
        title={video.title || ""}
        tagline={video.tagline || ""}
        description={video.description || ""}
        shareUrl={shareUrl}
        locale={locale}
        slug={video.slug}
      />

      {(video.channels?.length > 0 || video.tags?.length > 0) && (
        <div className="rounded-xl border p-4 space-y-2">
          <h2 className="text-sm font-medium">Metadata</h2>

          {video.channels?.length > 0 && (
            <div className="text-xs text-muted-foreground space-x-2">
              <span>Channels:</span>
              {video.channels.map((c: any) => (
                <Link
                  key={c.slug}
                  href={`/${locale}/channels/${c.slug}`}
                  className="underline hover:no-underline"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          )}
          {video.tags?.length > 0 && (
            <div className="text-xs text-muted-foreground">
              Tags: {video.tags.map((t: any) => t.name).join(", ")}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
