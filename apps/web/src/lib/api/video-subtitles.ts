import { apiFetch } from "../api";

export async function listVideoSubtitles(videoId: string) {
  const res = await apiFetch(`/creator/videos/${videoId}/subtitles`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load subtitles');
  }

  return res.json();
}

export async function uploadSubtitle(videoId: string, locale: string, file: File) {
  const formData = new FormData();
  formData.append('locale', locale);
  formData.append('file', file);

  const res = await apiFetch(`/creator/videos/${videoId}/subtitles`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to upload subtitle');
  }

  return res.json();
}

export async function deleteSubtitle(videoId: string, locale: string) {
  const res = await apiFetch(`/creator/videos/${videoId}/subtitles/${locale}`, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to delete subtitle');
  }

  return res.json();
}
