import { apiFetch } from "../api";

export async function updateVideoSchedule(
  videoId: string,
  scheduledAt: string | null,
) {
  const res = await apiFetch(`/creator/videos/${videoId}/schedule`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduledAt }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update schedule: ${errorText}`);
  }

  return res.json();
}
