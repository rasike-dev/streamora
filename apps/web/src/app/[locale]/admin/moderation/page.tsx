"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Row = {
  id: string;
  slug?: string | null;
  title: string | null;
  status: string; 
  uploaderName: string | null; 
  createdAt: string; 
  rejectionReason?: string | null;
  moderationVersion?: number;
  resubmittedAt?: string | null;
  takedownReason?: string | null;
  archivedReason?: string | null;
  takenDownAt?: string | null;
  archivedAt?: string | null;
};

export default function ModerationPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_APPROVAL");

  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const load = async () => {
    if (!token) return setErr("Not logged in");
    const res = await fetch(`${api}/admin/moderation/queue?status=${statusFilter}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return setErr(await res.text());
    setRows(await res.json());
  };

  useEffect(() => { load(); }, [statusFilter]);

  const act = async (id: string, action: "approve" | "reject" | "publish") => {
    if (!token) return;
    
    if (action === "reject") {
      setRejectingId(id);
      return;
    }
    
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

  const confirmReject = async (id: string) => {
    if (!token || !rejectReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }
    
    const res = await fetch(`${api}/admin/videos/${id}/reject`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        reason: rejectReason,
        note: rejectNote || undefined,
      }),
    });
    
    if (!res.ok) {
      alert(await res.text());
      return;
    }
    
    setRejectingId(null);
    setRejectReason("");
    setRejectNote("");
    await load();
  };

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <h1 className="text-xl font-semibold">Moderation Queue</h1>
      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="flex gap-2">
        {["PENDING_APPROVAL", "APPROVED", "REJECTED", "PUBLISHED", "TAKEDOWN", "ARCHIVED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-xl border px-3 py-1 text-sm ${
              statusFilter === s
                ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                : ""
            }`}
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {rows.length === 0 && !err && (
          <div className="text-sm text-muted-foreground">No pending videos</div>
        )}
        {rows.map((r) => (
          <div key={r.id} className="rounded-xl border p-4 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.title ?? "(no title)"}</div>
              {r.moderationVersion && r.moderationVersion > 1 && (
                <div className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                  Revision {r.moderationVersion}
                </div>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {r.status} • {r.uploaderName ?? "Uploader hidden"} • {new Date(r.createdAt).toLocaleString()}
              {r.resubmittedAt && (
                <span className="ml-2 text-amber-600 dark:text-amber-400">
                  • Resubmitted {new Date(r.resubmittedAt).toLocaleString()}
                </span>
              )}
            </div>
            {r.status === "PENDING_APPROVAL" && r.rejectionReason && (
              <div className="text-xs text-amber-600 dark:text-amber-400 border-t pt-2 mt-2">
                Previously rejected: {r.rejectionReason}
              </div>
            )}
            {r.status === "TAKEDOWN" && r.takedownReason && (
              <div className="text-xs text-red-600 dark:text-red-400 border-t pt-2 mt-2">
                <strong>Takedown Reason:</strong> {r.takedownReason}
                {r.takenDownAt && (
                  <span className="ml-2">({new Date(r.takenDownAt).toLocaleString()})</span>
                )}
              </div>
            )}
            {r.status === "ARCHIVED" && r.archivedReason && (
              <div className="text-xs text-gray-600 dark:text-gray-400 border-t pt-2 mt-2">
                <strong>Archive Reason:</strong> {r.archivedReason}
                {r.archivedAt && (
                  <span className="ml-2">({new Date(r.archivedAt).toLocaleString()})</span>
                )}
              </div>
            )}

            {rejectingId === r.id ? (
              <div className="space-y-2 border-t pt-2 mt-2">
                <div className="text-sm font-medium">Reject Video</div>
                <div>
                  <label className="text-xs text-muted-foreground">Reason (required)</label>
                  <input
                    type="text"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g., Video contains copyrighted content"
                    className="w-full rounded border px-2 py-1 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Admin Notes (optional)</label>
                  <textarea
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="e.g., Timestamp 00:42–01:03 contains music from a copyrighted source"
                    className="w-full rounded border px-2 py-1 text-sm mt-1"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-xl border px-3 py-1 text-sm bg-red-50 hover:bg-red-100"
                    onClick={() => confirmReject(r.id)}
                  >
                    Confirm Reject
                  </button>
                  <button
                    className="rounded-xl border px-3 py-1 text-sm"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectReason("");
                      setRejectNote("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 flex-wrap">
                {r.status === "PENDING_APPROVAL" && (
                  <>
                    <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "approve")}>
                      Approve
                    </button>
                    <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "publish")}>
                      Publish
                    </button>
                    <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => act(r.id, "reject")}>
                      Reject
                    </button>
                  </>
                )}
                {r.status === "PUBLISHED" && (
                  <>
                    <button
                      className="rounded-xl border px-3 py-1 text-sm bg-red-50 hover:bg-red-100"
                      onClick={async () => {
                        const reason = prompt("Takedown reason (required):");
                        if (!reason || !reason.trim()) {
                          alert("Takedown reason is required");
                          return;
                        }
                        const note = prompt("Admin notes (optional):");
                        try {
                          const res = await fetch(`${api}/admin/videos/${r.id}/takedown`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ reason: reason.trim(), note: note?.trim() || undefined }),
                          });
                          if (!res.ok) {
                            alert(await res.text());
                            return;
                          }
                          await load();
                        } catch (e: any) {
                          alert(`Failed: ${e.message}`);
                        }
                      }}
                    >
                      Take Down
                    </button>
                    <button
                      className="rounded-xl border px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100"
                      onClick={async () => {
                        const reason = prompt("Archive reason (optional):");
                        const note = prompt("Admin notes (optional):");
                        try {
                          const res = await fetch(`${api}/admin/videos/${r.id}/archive`, {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${token}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ reason: reason?.trim() || undefined, note: note?.trim() || undefined }),
                          });
                          if (!res.ok) {
                            alert(await res.text());
                            return;
                          }
                          await load();
                        } catch (e: any) {
                          alert(`Failed: ${e.message}`);
                        }
                      }}
                    >
                      Archive
                    </button>
                  </>
                )}
                {(r.status === "TAKEDOWN" || r.status === "ARCHIVED") && (
                  <button
                    className="rounded-xl border px-3 py-1 text-sm bg-green-50 hover:bg-green-100"
                    onClick={async () => {
                      const note = prompt("Restore note (optional):");
                      try {
                        const res = await fetch(`${api}/admin/videos/${r.id}/restore`, {
                          method: "POST",
                          headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ note: note?.trim() || undefined }),
                        });
                        if (!res.ok) {
                          alert(await res.text());
                          return;
                        }
                        await load();
                      } catch (e: any) {
                        alert(`Failed: ${e.message}`);
                      }
                    }}
                  >
                    Restore
                  </button>
                )}
                <a className="rounded-xl border px-3 py-1 text-sm" href={`/${locale}/watch/${r.id}`}>
                  Preview
                </a>
                <a className="rounded-xl border px-3 py-1 text-sm" href={r.slug ? `/${locale}/v/${r.slug}` : `/${locale}/watch/${r.id}`} target="_blank">
                  Share Page
                </a>
              </div>
            )}
            
            {r.status === "REJECTED" && r.rejectionReason && (
              <div className="mt-2 text-xs text-red-600 border-t pt-2">
                <strong>Reason:</strong> {r.rejectionReason}
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
