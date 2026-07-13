"use client";

import { recordMediaDownload } from "@/lib/api/public-media";

export function MediaDownloadButton({
  slug,
  locale,
  label,
}: {
  slug: string;
  locale: string;
  label: string;
}) {
  return (
    <a
      href="#"
      className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
      onClick={async (e) => {
        e.preventDefault();
        const item = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/public/media/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
        ).then((r) => (r.ok ? r.json() : null));
        if (!item?.downloadUrl) return;
        await recordMediaDownload(slug, locale);
        window.location.href = item.downloadUrl;
      }}
    >
      {label}
    </a>
  );
}
