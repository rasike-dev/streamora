"use client";

import { useRef } from "react";
import { UploadQueueItem } from "./UploadQueueItem";
import { useUploadQueue } from "./useUploadQueue";

export function BulkUploadManager({ locale }: { locale: string }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { items, stats, addFiles, pauseItem, retryItem, removeItem } = useUploadQueue();

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-4">
        <div>
          <h1 className="text-lg font-semibold">Bulk Upload Manager</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload multiple videos, track progress, and continue to metadata editing.
          </p>
        </div>

        <div>
          <button
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            Select Videos
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) {
                addFiles(e.target.files);
              }
              e.currentTarget.value = "";
            }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="text-lg font-semibold">{stats.total}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Active</div>
            <div className="text-lg font-semibold">{stats.active}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Completed</div>
            <div className="text-lg font-semibold">{stats.completed}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-muted-foreground">Failed</div>
            <div className="text-lg font-semibold">{stats.failed}</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-xl border p-6 text-sm text-muted-foreground text-center">
            No uploads yet. Select one or more video files to begin.
          </div>
        ) : (
          items.map((item) => (
            <UploadQueueItem
              key={item.localId}
              locale={locale}
              item={item}
              onPause={() => pauseItem(item.localId)}
              onRetry={() => retryItem(item.localId)}
              onRemove={() => removeItem(item.localId)}
            />
          ))
        )}
      </div>
    </div>
  );
}
