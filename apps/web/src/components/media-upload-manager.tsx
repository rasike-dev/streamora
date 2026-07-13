"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { uploadToGcsResumableSession } from "@/lib/resumableUpload";
import { apiFetch } from "@/lib/api";
import { createMediaDraft, type MediaKind } from "@/lib/api/creator-media";

type Limits = {
  image?: { maxBytes: number; allowedTypes: string[] };
  document?: { maxBytes: number; allowedTypes: string[] };
  maxUploadsPerDay?: number;
};

const ACCEPT: Record<MediaKind, string> = {
  IMAGE: "image/jpeg,image/png,image/webp,image/gif,image/avif",
  DOCUMENT:
    ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain,text/csv,application/zip",
};

export function MediaUploadManager({ locale }: { locale: string }) {
  const router = useRouter();
  const [kind, setKind] = useState<MediaKind>("IMAGE");
  const [limits, setLimits] = useState<Limits | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<
    "idle" | "initializing" | "uploading" | "done" | "failed"
  >("idle");
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/uploads/limits")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLimits(d))
      .catch(() => {});
  }, []);

  const maxBytes = useMemo(() => {
    if (!limits) return null;
    return kind === "IMAGE" ? limits.image?.maxBytes : limits.document?.maxBytes;
  }, [limits, kind]);

  const maxLabel = maxBytes ? `${Math.round(maxBytes / (1024 * 1024))} MB` : "";

  const startUpload = async () => {
    if (!file) {
      setMessage("Choose a file first.");
      return;
    }
    if (maxBytes && file.size > maxBytes) {
      setMessage(`File exceeds limit (${maxLabel}).`);
      return;
    }

    setStatus("initializing");
    setMessage(null);
    setPercent(0);

    try {
      const draft = await createMediaDraft({
        kind,
        locale,
        title: title.trim() || file.name.replace(/\.[^/.]+$/, "") || "Untitled",
        description: description.trim() || undefined,
      });

      const initRes = await apiFetch("/uploads/init", {
        method: "POST",
        body: JSON.stringify({
          mediaItemId: draft.id,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });

      if (!initRes.ok) {
        throw new Error(await initRes.text());
      }

      const init = await initRes.json();
      setStatus("uploading");

      const { promise } = uploadToGcsResumableSession({
        sessionUrl: init.resumableSessionUrl,
        file,
        onProgress: (p) => setPercent(p.percent),
        onProgressBytes: async (uploadedBytes) => {
          await apiFetch(`/uploads/${init.uploadIntentId}/progress`, {
            method: "POST",
            body: JSON.stringify({ uploadedBytes, status: "UPLOADING" }),
          }).catch(() => {});
        },
      });

      await promise;

      const completeRes = await apiFetch(
        `/uploads/${init.uploadIntentId}/complete`,
        { method: "POST" },
      );
      if (!completeRes.ok) {
        throw new Error(await completeRes.text());
      }

      setStatus("done");
      setPercent(100);
      router.push(`/${locale}/dashboard/media/${draft.id}/edit`);
    } catch (e: any) {
      setStatus("failed");
      setMessage(e?.message || "Upload failed");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className={`rounded-xl border px-4 py-2 text-sm ${
            kind === "IMAGE"
              ? "border-foreground bg-black/[0.06] font-semibold dark:bg-white/[0.08]"
              : "border-black/15 dark:border-white/15"
          }`}
          onClick={() => {
            setKind("IMAGE");
            setFile(null);
          }}
        >
          Image
        </button>
        <button
          type="button"
          className={`rounded-xl border px-4 py-2 text-sm ${
            kind === "DOCUMENT"
              ? "border-foreground bg-black/[0.06] font-semibold dark:bg-white/[0.08]"
              : "border-black/15 dark:border-white/15"
          }`}
          onClick={() => {
            setKind("DOCUMENT");
            setFile(null);
          }}
        >
          Document
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Title</span>
          <input
            className="w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block text-muted-foreground">Description</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <div>
        <input
          type="file"
          accept={ACCEPT[kind]}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        {maxLabel ? (
          <p className="mt-2 text-sm text-muted-foreground">
            Max size: {maxLabel}
          </p>
        ) : null}
      </div>

      {status === "uploading" ? (
        <div className="text-sm text-muted-foreground">Uploading… {percent}%</div>
      ) : null}
      {message ? <p className="text-sm text-red-600">{message}</p> : null}

      <button
        type="button"
        className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
        disabled={status === "initializing" || status === "uploading"}
        onClick={startUpload}
      >
        {status === "uploading" ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}
