import { apiFetch } from "../api";

export async function createOrGetMediaShareLink(mediaItemId: string) {
  const res = await apiFetch(`/media/${mediaItemId}/share`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create share link (${res.status})`);
  return res.json() as Promise<{
    code: string;
    shortUrl: string;
    targetUrl: string;
  }>;
}

export async function resolveMediaShortLink(code: string, locale?: string) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await fetch(`${api}/media-links/${code}${params}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("MEDIA_SHORT_LINK_NOT_FOUND");
  return res.json() as Promise<{
    code: string;
    target: { redirectUrl: string };
  }>;
}
