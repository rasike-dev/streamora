"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { PageFrame, PageHeading } from "@/components/layout";
import { apiFetch, readApiError } from "@/lib/api";

type Row = {
  id: string;
  slug?: string | null;
  kind: string;
  title: string | null;
  status: string;
  uploaderName: string | null;
  createdAt: string;
  rejectionReason?: string | null;
};

export default function MediaModerationPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING_APPROVAL");

  const load = useCallback(async () => {
    const res = await apiFetch(
      `/admin/media/moderation/queue?status=${statusFilter}`,
    );
    if (!res.ok) {
      setErr(await readApiError(res));
      setRows([]);
      return;
    }
    setErr(null);
    setRows(await res.json());
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (id: string, action: "approve" | "reject" | "publish") => {
    const res = await apiFetch(`/admin/media/${id}/${action}`, {
      method: "POST",
      body:
        action === "reject"
          ? JSON.stringify({ reason: "Needs changes", note: "" })
          : undefined,
    });
    if (!res.ok) {
      setErr(await readApiError(res));
      return;
    }
    await load();
  };

  return (
    <PageFrame>
      <PageHeading
        title="Media moderation"
        backHref={`/${locale}/admin`}
        backLabel="Admin"
      />

      <div className="mb-4">
        <select
          className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="PENDING_APPROVAL">Pending approval</option>
          <option value="REJECTED">Rejected</option>
          <option value="APPROVED">Approved</option>
          <option value="PUBLISHED">Published</option>
        </select>
      </div>

      {err ? <p className="mb-4 text-sm text-red-600">{err}</p> : null}

      <div className="space-y-3">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl border border-black/10 p-4 dark:border-white/10"
          >
            <div className="font-medium">
              {row.title || "Untitled"} ({row.kind})
            </div>
            <div className="text-sm text-muted-foreground">
              {row.status} · {row.uploaderName || "Unknown uploader"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {row.status === "PENDING_APPROVAL" ? (
                <>
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-1 text-sm"
                    onClick={() => act(row.id, "approve")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-1 text-sm"
                    onClick={() => act(row.id, "reject")}
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    className="rounded-xl border px-3 py-1 text-sm"
                    onClick={() => act(row.id, "publish")}
                  >
                    Publish
                  </button>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}
