import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { fetchPublicMedia } from "@/lib/api/public-media";
import { MediaDownloadButton } from "@/components/media-download-button";

type PageProps = {
  params: Promise<{ locale: string; slug: string }>;
};

export default async function PublicMediaPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const item = await fetchPublicMedia(slug, locale);
  if (!item) notFound();

  const isImage = item.kind === "IMAGE";
  const isPdf = item.contentType?.includes("pdf");

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 text-sm">
        <Link href={`/${locale}`} className="underline underline-offset-2">
          Home
        </Link>
      </div>

      <h1 className="text-2xl font-semibold">{item.title}</h1>
      {item.description ? (
        <p className="mt-2 text-muted-foreground">{item.description}</p>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-black/10 dark:border-white/10">
        {isImage && item.previewUrl ? (
          <Image
            src={item.previewUrl}
            alt={item.title}
            width={item.width || 1200}
            height={item.height || 800}
            unoptimized
            className="h-auto w-full object-contain"
          />
        ) : isPdf && item.previewUrl ? (
          <iframe
            src={item.previewUrl}
            title={item.title}
            className="h-[70vh] w-full"
          />
        ) : (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3 p-8 text-center">
            <p className="text-sm text-muted-foreground">
              {item.originalFilename || "Document"}
            </p>
            <MediaDownloadButton slug={slug} locale={locale} label="Download file" />
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span>{item.views} views</span>
        <span>{item.downloads} downloads</span>
        {!isImage ? (
          <MediaDownloadButton slug={slug} locale={locale} label="Download" />
        ) : null}
      </div>
    </main>
  );
}
