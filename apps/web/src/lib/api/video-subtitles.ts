export async function listVideoSubtitles(videoId: string) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/creator/videos/${videoId}/subtitles`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error('Failed to load subtitles');
  }

  return res.json();
}

export async function uploadSubtitle(videoId: string, locale: string, file: File) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const formData = new FormData();
  formData.append('locale', locale);
  formData.append('file', file);

  const res = await fetch(`${api}/creator/videos/${videoId}/subtitles`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
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
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/creator/videos/${videoId}/subtitles/${locale}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    credentials: 'include',
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to delete subtitle');
  }

  return res.json();
}
