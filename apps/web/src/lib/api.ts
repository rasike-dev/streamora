import { getValidAccessToken, refreshAccessToken } from "./auth/tokens";

function buildHeaders(init: RequestInit | undefined, token: string | null) {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  // Only default to JSON for string bodies; never override FormData/Blob.
  if (!headers.has("Content-Type") && typeof init?.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

/**
 * Authenticated fetch against the API.
 * - Proactively refreshes a soon-to-expire access token before sending.
 * - On a 401 (token rejected server-side), refreshes once and retries.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = path.startsWith("http") ? path : `${api}${path}`;

  const token = await getValidAccessToken();
  let res = await fetch(url, { ...init, headers: buildHeaders(init, token) });

  if (res.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(url, { ...init, headers: buildHeaders(init, refreshed) });
    }
  }

  return res;
}
