"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { completeUpload, failUpload, initUpload } from "@/lib/uploads/upload-client";
import { uploadFileToResumableUrl } from "@/lib/uploads/upload-xhr";

export type QueueUploadStatus =
  | "QUEUED"
  | "INITIATING"
  | "UPLOADING"
  | "PAUSED"
  | "COMPLETING"
  | "COMPLETED"
  | "FAILED";

export interface UploadQueueItem {
  localId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  progressPct: number;
  status: QueueUploadStatus;
  error?: string | null;
  file?: File;
  uploadIntentId?: string;
  videoId?: string;
  resumableSessionUrl?: string;
  objectKey?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "streamora.upload.queue";
const MAX_PARALLEL_UPLOADS = 2;

function uid() {
  return crypto.randomUUID();
}

export function useUploadQueue() {
  const [items, setItems] = useState<UploadQueueItem[]>([]);
  const controllersRef = useRef<Record<string, AbortController>>({});
  const runningRef = useRef(false);

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      const parsed: UploadQueueItem[] = JSON.parse(saved);
      setItems(parsed.map((x) => ({ ...x, file: undefined })));
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Persist to localStorage (without file objects)
  useEffect(() => {
    const persistable = items.map(({ file, ...rest }) => rest);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable));
  }, [items]);

  const updateItem = useCallback((localId: string, patch: Partial<UploadQueueItem>) => {
    setItems((prev) =>
      prev.map((item) =>
        item.localId === localId
          ? { ...item, ...patch, updatedAt: new Date().toISOString() }
          : item
      )
    );
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const next = Array.from(files).map<UploadQueueItem>((file) => ({
      localId: uid(),
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      progressPct: 0,
      status: "QUEUED",
      error: null,
      file,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    setItems((prev) => [...next, ...prev]);
  }, []);

  const pauseItem = useCallback(
    (localId: string) => {
      const controller = controllersRef.current[localId];
      if (controller) {
        controller.abort();
        delete controllersRef.current[localId];
      }
      updateItem(localId, { status: "PAUSED", error: null });
    },
    [updateItem]
  );

  const retryItem = useCallback(
    (localId: string, file?: File) => {
      setItems((prev) =>
        prev.map((item) =>
          item.localId === localId
            ? {
                ...item,
                status: "QUEUED",
                error: null,
                progressPct: item.status === "COMPLETED" ? 100 : item.progressPct,
                file: file ?? item.file,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    },
    []
  );

  const removeItem = useCallback((localId: string) => {
    const controller = controllersRef.current[localId];
    if (controller) {
      controller.abort();
      delete controllersRef.current[localId];
    }
    setItems((prev) => prev.filter((x) => x.localId !== localId));
  }, []);

  const processOne = useCallback(
    async (item: UploadQueueItem) => {
      if (!item.file) {
        updateItem(item.localId, {
          status: "FAILED",
          error: "File needs to be reselected after page refresh",
        });
        return;
      }

      try {
        let uploadIntentId = item.uploadIntentId;
        let resumableSessionUrl = item.resumableSessionUrl;
        let videoId = item.videoId;
        let objectKey = item.objectKey;

        if (!uploadIntentId || !resumableSessionUrl) {
          updateItem(item.localId, { status: "INITIATING", error: null });

          const init = await initUpload(item.file);
          uploadIntentId = init.uploadIntentId;
          resumableSessionUrl = init.resumableSessionUrl;
          videoId = init.videoId;
          objectKey = init.objectKey;

          updateItem(item.localId, {
            uploadIntentId,
            resumableSessionUrl,
            videoId,
            objectKey,
          });
        }

        updateItem(item.localId, { status: "UPLOADING", error: null });

        const controller = new AbortController();
        controllersRef.current[item.localId] = controller;

        await uploadFileToResumableUrl(
          item.file,
          resumableSessionUrl!,
          (pct) => updateItem(item.localId, { progressPct: pct }),
          controller.signal
        );

        delete controllersRef.current[item.localId];

        updateItem(item.localId, { status: "COMPLETING", progressPct: 100 });

        await completeUpload(uploadIntentId!);

        updateItem(item.localId, {
          status: "COMPLETED",
          error: null,
        });
      } catch (error: any) {
        const aborted = error?.message === "Upload aborted";
        if (aborted) return;

        if (item.uploadIntentId) {
          await failUpload(item.uploadIntentId, error?.message || "Upload failed").catch(() => {
            // Ignore errors on fail endpoint
          });
        }

        updateItem(item.localId, {
          status: "FAILED",
          error: error?.message || "Upload failed",
        });
      }
    },
    [updateItem]
  );

  const runQueue = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;

    try {
      while (true) {
        const snapshot = [...items];
        const activeCount = snapshot.filter(
          (x) => x.status === "INITIATING" || x.status === "UPLOADING" || x.status === "COMPLETING"
        ).length;

        if (activeCount >= MAX_PARALLEL_UPLOADS) break;

        const nextItem = snapshot.find((x) => x.status === "QUEUED");
        if (!nextItem) break;

        void processOne(nextItem);
      }
    } finally {
      runningRef.current = false;
    }
  }, [items, processOne]);

  useEffect(() => {
    void runQueue();
  }, [runQueue]);

  const stats = useMemo(() => {
    const total = items.length;
    const completed = items.filter((x) => x.status === "COMPLETED").length;
    const failed = items.filter((x) => x.status === "FAILED").length;
    const active = items.filter(
      (x) => x.status === "INITIATING" || x.status === "UPLOADING" || x.status === "COMPLETING"
    ).length;

    return { total, completed, failed, active };
  }, [items]);

  return {
    items,
    stats,
    addFiles,
    pauseItem,
    retryItem,
    removeItem,
  };
}
