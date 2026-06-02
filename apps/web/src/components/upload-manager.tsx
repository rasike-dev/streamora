"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { uploadToGcsResumableSession } from "@/lib/resumableUpload";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type UploadItem = {
  id: string;
  videoId: string;
  file?: File | null;
  status: "idle" | "initializing" | "uploading" | "done" | "failed" | "cancelled";
  percent: number;
  message?: string;
  objectKey?: string;
  uploadIntentId?: string; // DB intent id (server-known)
};

export function UploadManager({ locale }: { locale: string }) {
  const [limits, setLimits] = useState<{ maxBytes: number } | null>(null);
  const [videoId, setVideoId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const cancels = useRef<Record<string, () => void>>({});
  const resumeInputs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!getAccessToken()) return;

    // Load limits
    apiFetch(`/uploads/limits`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setLimits(d))
      .catch(() => {});

    // Load in-progress uploads from DB
    apiFetch(`/creator/uploads`)
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setItems((prev) => {
          const existing = new Set(prev.map((p) => p.uploadIntentId).filter(Boolean) as string[]);
          const mapped = list
            .filter((x: any) => !existing.has(x.id))
            .map((x: any) => ({
              id: crypto.randomUUID(),
              videoId: x.videoId,
              file: null, // unknown after refresh; user will reselect file to resume
              status: x.status === "FAILED" ? "failed" : "idle",
              percent: x.percent,
              message: x.lastError
                ? `Failed previously: ${x.lastError}. Click Resume.`
                : "Upload was in progress. Click Resume to continue.",
              objectKey: x.objectKey,
              uploadIntentId: x.id,
            }));
          return [...mapped, ...prev];
        });
      })
      .catch(() => {});
  }, []);

  const maxBytesLabel = useMemo(() => {
    if (!limits?.maxBytes) return "";
    const mb = Math.round(limits.maxBytes / (1024 * 1024));
    return `${mb} MB`;
  }, [limits]);

  const addFile = (file: File) => {
    const id = crypto.randomUUID();
    setItems((prev) => [
      ...prev,
      {
        id,
        videoId,
        file,
        status: "idle",
        percent: 0,
      },
    ]);
  };

  const createDraftIfNeeded = async (item: UploadItem) => {
    const existingVideoId = item.videoId?.trim();
    if (existingVideoId) return existingVideoId;

    if (!getAccessToken()) throw new Error("Session expired. Please sign in again.");

    const fallbackTitle = item.file?.name
      ? item.file.name.replace(/\.[^/.]+$/, "")
      : "";

    const res = await apiFetch(`/creator/videos/draft`, {
      method: "POST",
      body: JSON.stringify({
        locale,
        title: title.trim() || fallbackTitle || "Untitled upload",
        description: description.trim() || undefined,
        tagline: tagline.trim() || undefined,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Session expired. Please sign in again.");
      }
      throw new Error(`Failed to create draft: ${await res.text()}`);
    }

    const draft = await res.json();
    const draftId = draft?.id;
    if (!draftId) {
      throw new Error("Draft creation failed: missing video id");
    }

    setVideoId(draftId);
    setItems((prev) =>
      prev.map((x) =>
        x.id === item.id ? { ...x, videoId: draftId, message: "Draft created." } : x
      )
    );

    return draftId;
  };

  const openResumePicker = (itemId: string) => {
    resumeInputs.current[itemId]?.click();
  };

  const attachFileToItem = (itemId: string, f: File) => {
    setItems((prev) =>
      prev.map((x) =>
        x.id === itemId
          ? {
              ...x,
              file: f,
              status: "idle",
              percent: 0,
              message: "Ready to resume. Click Start.",
            }
          : x
      )
    );
  };

  const initUpload = async (item: UploadItem) => {
    if (!getAccessToken()) throw new Error("Session expired. Please sign in again.");

    if (!item.file) throw new Error("File required");
    const resolvedVideoId = await createDraftIfNeeded(item);

    // Client-side size check (server still enforces)
    if (limits?.maxBytes && item.file.size > limits.maxBytes) {
      throw new Error(`File too large. Max: ${maxBytesLabel}`);
    }

    const res = await apiFetch(`/uploads/init`, {
      method: "POST",
      body: JSON.stringify({
        videoId: resolvedVideoId,
        filename: item.file.name,
        contentType: item.file.type || "application/octet-stream",
        sizeBytes: item.file.size,
        uploadIntentId: item.uploadIntentId ?? undefined,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Session expired. Please sign in again.");
      }
      throw new Error(await res.text());
    }
    const init = (await res.json()) as {
      uploadIntentId: string;
      objectKey: string;
      resumableSessionUrl: string;
    };
    return {
      ...init,
      videoId: resolvedVideoId,
    };
  };

  const persistProgressThrottled = (() => {
    let lastAt = 0;
    return async (uploadIntentId: string, uploadedBytes: number) => {
      const now = Date.now();
      if (now - lastAt < 1200) return; // ~1.2s throttle
      lastAt = now;

      await apiFetch(`/uploads/${uploadIntentId}/progress`, {
        method: "POST",
        body: JSON.stringify({ uploadedBytes, status: "UPLOADING" }),
      }).catch(() => {});
    };
  })();

  const start = async (id: string) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "initializing", message: "Initializing..." } : x))
    );

    const item = items.find((x) => x.id === id);
    if (!item) return;

    if (!item.file) {
      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "failed", message: "Select a file to resume first." } : x))
      );
      return;
    }

    try {
      const init = await initUpload(item);

      setItems((prev) =>
        prev.map((x) =>
          x.id === id
            ? {
                ...x,
                status: "uploading",
                message: "Uploading...",
                uploadIntentId: init.uploadIntentId,
                objectKey: init.objectKey,
              }
            : x
        )
      );

      const { promise, cancel } = uploadToGcsResumableSession({
        sessionUrl: init.resumableSessionUrl,
        file: item.file!,
        onProgress: (p) => {
          setItems((prev) => prev.map((x) => (x.id === id ? { ...x, percent: p.percent } : x)));
        },
        onProgressBytes: (bytes) => {
          setItems((prev) =>
            prev.map((x) =>
              x.id === id ? { ...x, percent: Math.round((bytes / item.file!.size) * 100) } : x
            )
          );
          if (init.uploadIntentId) persistProgressThrottled(init.uploadIntentId, bytes);
        },
      });

      cancels.current[id] = cancel;
      await promise;

      // Mark as complete in DB and verify
      const completeRes = await apiFetch(`/uploads/${init.uploadIntentId}/complete`, {
        method: "POST",
      });

      if (!completeRes.ok) {
        if (completeRes.status === 401) {
          throw new Error("Session expired. Please sign in again.");
        }
        const errorText = await completeRes.text();
        throw new Error(`Verification failed: ${errorText}`);
      }

      setItems((prev) =>
        prev.map((x) => (x.id === id ? { ...x, status: "done", message: "Upload complete ✅ Processing started. Redirecting you to edit details…", percent: 100 } : x))
      );
      const finalVideoId = init.videoId;
      if (finalVideoId) {
        setTimeout(() => {
          window.location.href = `/${locale}/dashboard/videos/${finalVideoId}/edit`;
        }, 1200);
      }
    } catch (e: any) {
      const item = items.find((x) => x.id === id);
      const uploadedBytes = item?.file ? Math.floor((item.percent / 100) * item.file.size) : 0;

      // Mark as failed in DB
      if (item?.uploadIntentId) {
        await apiFetch(`/uploads/${item.uploadIntentId}/fail`, {
          method: "POST",
          body: JSON.stringify({ error: e?.message || "Failed", uploadedBytes }),
        }).catch(() => {});
      }

      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, status: "failed", message: e?.message || "Failed" } : x
        )
      );
      if ((e?.message || "").includes("Session expired")) {
        setTimeout(() => {
          window.location.href = `/${locale}/login`;
        }, 400);
      }
    } finally {
      delete cancels.current[id];
    }
  };

  const cancel = (id: string) => {
    cancels.current[id]?.();
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "cancelled", message: "Cancelled" } : x))
    );
  };

  const retry = (id: string) => {
    setItems((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: "idle", percent: 0, message: undefined } : x))
    );
    // Start again
    setTimeout(() => start(id), 0);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Upload (Locale: {locale})</div>

        <div className="text-[11px] text-muted-foreground">
          Add optional details now (you can edit everything after upload), then choose your video file.
        </div>

        <div className="grid gap-2 md:grid-cols-3">
          <input
            className="rounded-xl border p-2 text-sm"
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            className="rounded-xl border p-2 text-sm"
            placeholder="Tagline (optional)"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
          />
          <input
            className="rounded-xl border p-2 text-sm md:col-span-3"
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          Max size (your role): {limits ? maxBytesLabel : "…"}
        </div>

        <input
          type="file"
          accept="video/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addFile(f);
          }}
        />
      </div>

      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.id} className="rounded-xl border p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">
                  {it.file?.name || it.objectKey || "Unknown file"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {it.status.toUpperCase()} • {it.percent}%
                </div>
                {!it.file && (
                  <div className="text-xs text-muted-foreground mt-1">
                    File not attached (refresh). Click <b>Resume</b> to reselect it.
                  </div>
                )}
                {it.objectKey && (
                  <div className="text-[11px] text-muted-foreground break-all mt-1">
                    {it.objectKey}
                  </div>
                )}
              </div>

              <div className="flex gap-2 flex-shrink-0">
                {/* If this is a DB-known upload but file is missing => Resume */}
                {!it.file && (it.status === "uploading" || it.status === "failed" || it.status === "idle") && (
                  <button
                    className="rounded-xl border px-3 py-1 text-sm"
                    onClick={() => openResumePicker(it.id)}
                    title="Select the same file again to resume"
                  >
                    Resume
                  </button>
                )}

                {/* Start */}
                {it.file && it.status === "idle" && (
                  <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => start(it.id)}>
                    Start
                  </button>
                )}

                {/* Cancel */}
                {it.status === "uploading" && (
                  <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => cancel(it.id)}>
                    Cancel
                  </button>
                )}

                {/* Retry (needs file) */}
                {it.file && it.status === "failed" && (
                  <button className="rounded-xl border px-3 py-1 text-sm" onClick={() => retry(it.id)}>
                    Retry
                  </button>
                )}
              </div>
            </div>

            <div className="h-2 w-full rounded-full border overflow-hidden bg-gray-100">
              <div 
                className="h-full bg-blue-500 transition-all" 
                style={{ width: `${it.percent}%` }} 
              />
            </div>

            {it.message && <div className="text-xs text-muted-foreground">{it.message}</div>}

            {/* Hidden file input for resume */}
            <input
              ref={(el) => {
                resumeInputs.current[it.id] = el;
              }}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) attachFileToItem(it.id, f);
                // reset value so selecting same file again still triggers change
                if (resumeInputs.current[it.id]) resumeInputs.current[it.id]!.value = "";
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
