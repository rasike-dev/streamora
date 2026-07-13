import Link from "next/link";

const btnGhost =
  "rounded-xl border border-black/15 px-4 py-2 text-sm hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]";

type Props = {
  locale: string;
  bulkUploads: string;
  myVideos: string;
  myMedia: string;
  newUpload: string;
  uploadMedia: string;
};

export function DashboardQuickActions({
  locale,
  bulkUploads,
  myVideos,
  myMedia,
  newUpload,
  uploadMedia,
}: Props) {
  return (
    <section className="rounded-2xl border border-black/10 bg-black/[0.02] p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04]">
      <h2 className="mb-3 text-lg font-semibold">Creator tools</h2>
      <div className="flex flex-wrap gap-3">
        <Link href={`/${locale}/upload`} className={btnGhost}>
          {newUpload}
        </Link>
        <Link href={`/${locale}/upload/media`} className={btnGhost}>
          {uploadMedia}
        </Link>
        <Link href={`/${locale}/dashboard/videos`} className={btnGhost}>
          {myVideos}
        </Link>
        <Link href={`/${locale}/dashboard/media`} className={btnGhost}>
          {myMedia}
        </Link>
        <Link href={`/${locale}/dashboard/uploads`} className={btnGhost}>
          {bulkUploads}
        </Link>
      </div>
    </section>
  );
}
