import { apiFetch } from "../api";

export async function getCreatorVideoAnalytics(videoId: string, days = 30) {
  const res = await apiFetch(
    `/creator/videos/${videoId}/analytics?days=${days}`,
    {
      cache: "no-store",
    }
  );

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('FETCH_FAILED');
  }

  return res.json();
}
