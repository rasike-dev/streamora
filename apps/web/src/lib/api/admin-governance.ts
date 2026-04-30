export async function takedownVideo(videoId: string, reason: string, note?: string) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/admin/videos/${videoId}/takedown`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/admin/videos/${videoId}/archive`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
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
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem('access_token');

  if (!token) {
    throw new Error('Not authenticated');
  }

  const res = await fetch(`${api}/admin/videos/${videoId}/restore`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ note }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || 'Failed to restore video');
  }

  return res.json();
}
