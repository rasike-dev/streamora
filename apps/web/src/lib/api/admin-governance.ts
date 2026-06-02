import { apiFetch } from "../api";

export async function takedownVideo(videoId: string, reason: string, note?: string) {
  const res = await apiFetch(`/admin/videos/${videoId}/takedown`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ reason, note }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to takedown video');
  }

  return res.json();
}

export async function archiveVideo(videoId: string, reason?: string, note?: string) {
  const res = await apiFetch(`/admin/videos/${videoId}/archive`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ reason, note }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to archive video');
  }

  return res.json();
}

export async function restoreVideo(videoId: string, note?: string) {
  const res = await apiFetch(`/admin/videos/${videoId}/restore`, {
    method: 'POST',
    credentials: 'include',
    body: JSON.stringify({ note }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to restore video');
  }

  return res.json();
}
