export async function updateVideoSchedule(
  videoId: string,
  scheduledAt: string | null,
) {
  const api = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const token = localStorage.getItem('access_token');

  const res = await fetch(`${api}/creator/videos/${videoId}/schedule`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ scheduledAt }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update schedule: ${errorText}`);
  }

  return res.json();
}
