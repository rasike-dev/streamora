import { apiFetch } from "../api";

export async function updateVideoVisibility(
  videoId: string,
  visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
) {
  const res = await apiFetch(`/creator/videos/${videoId}/visibility`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ visibility }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to update visibility: ${errorText}`);
  }

  return res.json();
}
