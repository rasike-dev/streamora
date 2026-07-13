import { getApiToken, clearTokens } from "./auth/tokens";

function buildHeaders(init: RequestInit | undefined, token: string | null) {
  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && typeof init?.body === "string") {
    headers.set("Content-Type", "application/json");
  }
  return headers;
}

/**
 * Authenticated fetch against the API using Clerk session tokens.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const url = path.startsWith("http") ? path : `${api}${path}`;

  let token = await getApiToken();
  let res = await fetch(url, { ...init, headers: buildHeaders(init, token) });

  if (res.status === 401) {
    token = await getApiToken({ reloadSession: true, skipCache: true });
    if (token) {
      res = await fetch(url, { ...init, headers: buildHeaders(init, token) });
    }
  }

  if (res.status === 401) {
    clearTokens();
  }

  return res;
}

/** Best-effort parse of NestJS error JSON `{ message: string | string[] }`. */
export async function readApiError(res: Response): Promise<string> {
  const raw = await res.text().catch(() => "");
  if (!raw) return `Request failed (${res.status})`;
  try {
    const body = JSON.parse(raw) as { message?: string | string[] };
    if (Array.isArray(body.message)) return body.message.join(", ");
    if (typeof body.message === "string") return body.message;
  } catch {
    // not JSON
  }
  return raw;
}
