import { apiFetch } from "../api";

export async function getCreatorVideos(params: {
  locale: string;
  q?: string;
  status?: string;
  visibility?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = new URLSearchParams({
    locale: params.locale,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 12),
  });

  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.visibility) search.set('visibility', params.visibility);

  const res = await apiFetch(`/creator/videos?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('FETCH_FAILED');
  }

  return res.json();
}

export async function resubmitCreatorVideo(videoId: string) {
  const res = await apiFetch(`/creator/videos/${videoId}/resubmit`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to resubmit video');
  }

  return res.json();
}

export async function reprocessCreatorVideo(videoId: string) {
  const res = await apiFetch(`/creator/videos/${videoId}/reprocess`, {
    method: 'POST',
  });

  if (!res.ok) {
    const raw = await res.text().catch(() => '');
    let message = raw;
    try {
      message = JSON.parse(raw)?.message || raw;
    } catch {
      // raw is not JSON; use as-is
    }
    throw new Error(message || 'Failed to start processing');
  }

  return res.json();
}
