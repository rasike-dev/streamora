import { apiFetch } from "../api";

export async function getVideoThumbnails(videoId: string) {
  const res = await apiFetch(`/creator/videos/${videoId}/thumbnails`, {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("Failed to load thumbnails");
  }

  return res.json();
}

export async function selectVideoThumbnail(videoId: string, thumbnailId: string) {
  const res = await apiFetch(
    `/creator/videos/${videoId}/thumbnails/${thumbnailId}/select`,
    {
      method: "POST",
    }
  );

  if (!res.ok) {
    throw new Error("Failed to select thumbnail");
  }

  return res.json();
}

export async function uploadCustomThumbnail(videoId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch(`/creator/videos/${videoId}/thumbnails/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload thumbnail: ${errorText}`);
  }

  return res.json();
}
