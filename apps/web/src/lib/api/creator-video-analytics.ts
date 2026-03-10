export async function getCreatorVideoAnalytics(videoId: string, days = 30) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem("access_token");

  const res = await fetch(
    `${api}/creator/videos/${videoId}/analytics?days=${days}`,
    {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to load analytics");
  }

  return res.json();
}
