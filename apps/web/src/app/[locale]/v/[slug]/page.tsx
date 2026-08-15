import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { SiteHeader } from "@/components/layout/site-header";
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
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
  const description =
    video.description || video.tagline || "Watch on Streamora";
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

export default async function VideoSharePage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "videoDetail" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tVideos = await getTranslations({ locale, namespace: "videosPage" });
  const tTaxonomy = await getTranslations({ locale, namespace: "taxonomy" });

  const video = await getVideo(locale, slug);

  if (!video) {
    return (
      <div className="flex min-h-dvh flex-col">
        <SiteHeader locale={locale} />
        <main className="flex-1">
          <PageFrame>
            <PageHeading
              title={t("notFoundTitle")}
              description={t("notFoundBody")}
              backHref={`/${locale}/videos`}
              backLabel={tCommon("backToCatalog")}
            />
            <UserBanner
              variant="warning"
              title={t("notFoundTitle")}
              body={t("notFoundBody")}
              primaryAction={{
                href: `/${locale}/videos`,
                label: tVideos("title"),
              }}
              secondaryAction={{
                href: `/${locale}`,
                label: tCommon("home"),
              }}
            />
          </PageFrame>
        </main>
      </div>
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const shareUrl = `${appUrl}/${locale}/v/${video.slug}`;

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

  const metaSurface =
    "rounded-xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]";

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader locale={locale} />

      <main className="flex-1">
        <PageFrame>
          {video.breadcrumb?.category && video.breadcrumb?.subcategory ? (
            <nav className="mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <Link href={`/${locale}/categories`} className="hover:underline">
                {tTaxonomy("categories")}
              </Link>
              <span>/</span>
              <Link
                href={`/${locale}/categories/${video.breadcrumb.category.slug}`}
                className="hover:underline"
              >
                {video.breadcrumb.category.name}
              </Link>
              <span>/</span>
              <Link
                href={`/${locale}/categories/${video.breadcrumb.category.slug}/${video.breadcrumb.subcategory.slug}`}
                className="hover:underline"
              >
                {video.breadcrumb.subcategory.name}
              </Link>
              <span>/</span>
              <Link
                href={`/${locale}/channels/${video.breadcrumb.channel.slug}`}
                className="hover:underline"
              >
                {video.breadcrumb.channel.name}
              </Link>
            </nav>
          ) : null}

          <PageHeading
            title={video.title || t("untitled")}
            description={video.tagline || undefined}
            backHref={`/${locale}/videos`}
            backLabel={tCommon("backToCatalog")}
          />

          {video.uploader ? (
            <p className="-mt-2 mb-4 text-xs text-muted-foreground">
              {t("byAuthor", { name: video.uploader })}
            </p>
          ) : null}

          <PublicVideoPlayer
            videoId={video.id}
            playbackUrl={video.playbackUrl}
            posterUrl={video.thumbnailUrl}
            locale={locale}
            trafficSource={trafficSource as any}
            subtitles={video.subtitles || []}
          />

          {video.description ? (
            <div className={`mt-4 ${metaSurface}`}>
              <h2 className="mb-2 text-sm font-medium">
                {t("descriptionHeading")}
              </h2>
              <p className="whitespace-pre-wrap text-sm">{video.description}</p>
            </div>
          ) : null}

          <div className="mt-4">
            <ShareActions
              title={video.title || ""}
              tagline={video.tagline || ""}
              description={video.description || ""}
              shareUrl={shareUrl}
              locale={locale}
              slug={video.slug}
            />
          </div>

          {(video.channels?.length > 0 || video.tags?.length > 0) && (
            <div className={`mt-4 space-y-2 ${metaSurface}`}>
              <h2 className="text-sm font-medium">{t("metadataHeading")}</h2>

              {video.channels?.length > 0 && (
                <div className="space-x-2 text-xs text-muted-foreground">
                  <span>{t("channelsLabel")}</span>
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
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t("tagsLabel")}</span>
                  {video.tags.map((tg: any) => (
                    <Link
                      key={tg.slug}
                      href={`/${locale}/tags/${tg.slug}?src=tag`}
                      className="rounded-full border border-black/10 px-2 py-0.5 hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
                    >
                      {tg.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </PageFrame>
      </main>
    </div>
  );
}
