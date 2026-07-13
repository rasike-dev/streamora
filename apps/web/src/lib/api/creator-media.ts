import { apiFetch } from "../api";

export type MediaKind = "IMAGE" | "DOCUMENT";

export async function createMediaDraft(body: {
  kind: MediaKind;
  locale?: string;
  title?: string;
  description?: string;
  tagline?: string;
}) {
  const res = await apiFetch("/creator/media/draft", {
    method: "POST",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to create media draft (${res.status})`);
  return res.json();
}

export async function listCreatorMedia(params: {
  kind?: MediaKind;
  locale?: string;
  page?: number;
}) {
  const search = new URLSearchParams();
  if (params.kind) search.set("kind", params.kind);
  if (params.locale) search.set("locale", params.locale);
  if (params.page) search.set("page", String(params.page));

  const res = await apiFetch(`/creator/media?${search.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Failed to list media (${res.status})`);
  return res.json();
}

export async function getCreatorMedia(id: string) {
  const res = await apiFetch(`/creator/media/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to load media (${res.status})`);
  return res.json();
}

export async function updateCreatorMedia(
  id: string,
  body: {
    translations?: Array<{
      locale: string;
      title?: string | null;
      description?: string | null;
      tagline?: string | null;
    }>;
  },
) {
  const res = await apiFetch(`/creator/media/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to update media (${res.status})`);
  return res.json();
}

export async function submitMediaForModeration(id: string) {
  const res = await apiFetch(`/creator/media/${id}/submit`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to submit media (${res.status})`);
  return res.json();
}

export async function resubmitMedia(id: string) {
  const res = await apiFetch(`/creator/media/${id}/resubmit`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to resubmit media (${res.status})`);
  return res.json();
}

export async function updateMediaVisibility(
  id: string,
  visibility: "PUBLIC" | "UNLISTED" | "PRIVATE",
) {
  const res = await apiFetch(`/creator/media/${id}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
  if (!res.ok) throw new Error(`Failed to update visibility (${res.status})`);
  return res.json();
}
