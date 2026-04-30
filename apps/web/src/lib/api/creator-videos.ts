export async function getCreatorVideos(params: {
  locale: string;
  q?: string;
  status?: string;
  visibility?: string;
  page?: number;
  pageSize?: number;
}) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  const search = new URLSearchParams({
    locale: params.locale,
    page: String(params.page ?? 1),
    pageSize: String(params.pageSize ?? 12),
  });

  if (params.q) search.set('q', params.q);
  if (params.status) search.set('status', params.status);
  if (params.visibility) search.set('visibility', params.visibility);

  const res = await fetch(`${api}/creator/videos?${search.toString()}`, {
    cache: 'no-store',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load creator videos');
  }

  return res.json();
}

export async function resubmitCreatorVideo(videoId: string) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/creator/videos/${videoId}/resubmit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to resubmit video');
  }

  return res.json();
}
