export async function apiFetch(path: string, init?: RequestInit) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const token = localStorage.getItem("access_token");
  const headers = new Headers(init?.headers);

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) headers.set("Content-Type", "application/json");

  const res = await fetch(`${api}${path}`, { ...init, headers });
  return res;
}
