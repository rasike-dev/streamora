"use client";

import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const api = process.env.NEXT_PUBLIC_API_URL!;
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErr("Not logged in. Go to /login");
        return;
      }

      try {
        const res = await fetch(`${api}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          const errorText = await res.text();
          setErr(`Failed: ${res.status} - ${errorText}`);
          console.error("API Error:", {
            status: res.status,
            statusText: res.statusText,
            error: errorText,
            token: token.substring(0, 20) + "...",
          });
          return;
        }
        setMe(await res.json());
      } catch (error) {
        setErr(`Network error: ${error instanceof Error ? error.message : String(error)}`);
        console.error("Fetch error:", error);
      }
    };
    load();
  }, []);

  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-2">Creator Dashboard</h1>

      {err && <p className="text-sm text-red-600">{err}</p>}
      {me && (
        <div className="rounded-xl border p-4">
          <div className="text-sm">User: {me.username}</div>
          <div className="text-sm">Email: {me.email ?? "-"}</div>
          <div className="text-sm">Roles: {(me.roles ?? []).join(", ")}</div>
        </div>
      )}
    </main>
  );
}

