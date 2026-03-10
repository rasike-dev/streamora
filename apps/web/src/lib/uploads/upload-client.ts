import { apiFetch } from "../api";

export interface InitUploadResponse {
  uploadIntentId: string;
  videoId: string;
  resumableSessionUrl: string;
  objectKey: string;
  expiresInSeconds?: number;
}

export async function initUpload(file: File, videoId?: string): Promise<InitUploadResponse> {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  // If no videoId provided, create a draft first
  let finalVideoId = videoId;
  if (!finalVideoId) {
    const draftRes = await apiFetch("/creator/videos/draft", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locale: "en",
        title: file.name.replace(/\.[^/.]+$/, ""), // Remove extension for title
      }),
    });

    if (!draftRes.ok) {
      const errorText = await draftRes.text();
      throw new Error(`Failed to create draft: ${errorText}`);
    }

    const draft = await draftRes.json();
    finalVideoId = draft.id;
  }

  const res = await apiFetch("/uploads/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      videoId: finalVideoId,
      filename: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to initialize upload: ${errorText}`);
  }

  return res.json();
}

export async function completeUpload(uploadIntentId: string) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await apiFetch(`/uploads/${uploadIntentId}/complete`, {
    method: "POST",
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to complete upload: ${errorText}`);
  }

  return res.json();
}

export async function failUpload(uploadIntentId: string, error: string) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  await apiFetch(`/uploads/${uploadIntentId}/fail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ error }),
  }).catch(() => {
    // Ignore errors on fail endpoint
  });
}

export async function getUploadStatus(uploadIntentId: string) {
  const token = localStorage.getItem("access_token");
  if (!token) {
    throw new Error("Not authenticated");
  }

  const res = await apiFetch(`/uploads/${uploadIntentId}/status`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to get upload status`);
  }

  return res.json();
}
