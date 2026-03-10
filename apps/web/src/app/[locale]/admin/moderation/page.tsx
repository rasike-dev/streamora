"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = { id: string; title: string | null; status: string; uploaderName: string | null; createdAt: string };

export default function ModerationPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const load = async () => {
    if (!token) return setErr("Not logged in");
    const res = await fetch(`${api}/admin/moderation/queue?status=PENDING_APPROVAL`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return setErr(await res.text());
    setRows(await res.json());
  };

  useEffect(() => { load(); }, []);

  const act = async (id: string, action: "approve" | "reject" | "publish") => {
    if (!token) return;
    const res = await fetch(`${api}/admin/videos/${id}/${action}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    await load();
  };

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <h1 className="text-xl font-semibold">Moderation Queue</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="space-y-3">
        {rows.length === 0 && !err && (
          <div className="text-sm text-muted-foreground">No pending videos</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border p-4 space-y-2">
            <div className="text-sm font-medium">{r.title ?? "(no title)"}</div>
            <div className="text-xs text-muted-foreground">
              {r.status} • {r.uploaderName ?? "Uploader hidden"} • {new Date(r.createdAt).toLocaleString()}
            </div>

            <div className="flex gap-2">
              <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "approve")}>
                Approve
              </button>
              <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "publish")}>
                Publish
              </button>
              <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "reject")}>
                Reject
              </button>
              <a className="rounded-xl border px-3 py-1 text-sm" href={`/${locale}/watch/${r.id}`}>
                Preview
              </a>
              <a className="rounded-xl border px-3 py-1 text-sm" href={`/${locale}/v/${r.slug}`} target="_blank">
                Share Page
              </a>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
