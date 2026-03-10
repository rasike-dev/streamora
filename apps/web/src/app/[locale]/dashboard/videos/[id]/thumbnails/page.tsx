import Link from "next/link";
import { ThumbnailPicker } from "@/components/videos/ThumbnailPicker";

export default async function VideoThumbnailsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;

  return (
    <main className="min-h-dvh p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Manage Thumbnails</h1>
          <Link
            href={`/${locale}/dashboard/videos/${id}/edit`}
            className="text-sm text-blue-600 underline"
          >
            Back to Edit
          </Link>
        </div>

        <ThumbnailPicker locale={locale} videoId={id} />
      </div>
    </main>
  );
}
