"use client";

import { useEffect, useState } from "react";

type JobRow = {
  id: string;
  videoId: string;
  videoTitle: string | null;
  jobType: string;
  status: string;
  attempts: number;
  lastError: string | null;
  correlationId: string | null;
  createdAt: string;
};

export default function AdminJobsPage() {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [rows, setRows] = useState<JobRow[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setErr("Not logged in");
      return;
    }

    fetch(`${api}/admin/jobs?status=FAILED`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(await r.text());
        return r.json();
      })
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, [api]);

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <h1 className="text-xl font-semibold">Failed Jobs</h1>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="space-y-3">
        {rows.map((j) => (
          <div key={j.id} className="rounded-xl border p-4 space-y-2">
            <div className="text-sm font-medium">
              {j.videoTitle || "(untitled video)"}
            </div>

            <div className="text-xs text-muted-foreground">
              {j.jobType} • {j.status} • attempts: {j.attempts}
            </div>

            {j.lastError && (
              <div className="text-xs text-red-600 whitespace-pre-wrap">
                {j.lastError}
              </div>
            )}

            {j.correlationId && (
              <div className="text-[11px] text-muted-foreground break-all">
                correlationId: {j.correlationId}
              </div>
            )}
          </div>
        ))}

        {!rows.length && (
          <div className="rounded-xl border p-4 text-sm text-muted-foreground">
            No failed jobs.
          </div>
        )}
      </div>
    </main>
  );
}
