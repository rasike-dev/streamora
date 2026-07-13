const API = process.env.NEXT_PUBLIC_API_URL!;

export async function fetchPublicMedia(slug: string, locale = "en") {
  const res = await fetch(
    `${API}/public/media/${encodeURIComponent(slug)}?locale=${encodeURIComponent(locale)}`,
    { cache: "no-store" },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function fetchPublicMediaList(locale = "en", page = 1) {
  const res = await fetch(
    `${API}/media?locale=${encodeURIComponent(locale)}&page=${page}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return { items: [], page: 1, pageSize: 24, total: 0 };
  return res.json();
}

export async function recordMediaDownload(slug: string, locale = "en") {
  await fetch(
    `${API}/public/media/${encodeURIComponent(slug)}/download?locale=${encodeURIComponent(locale)}`,
    { method: "POST" },
  ).catch(() => {});
}
