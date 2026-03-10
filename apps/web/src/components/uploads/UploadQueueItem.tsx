"use client";

import Link from "next/link";

type Props = {
  locale: string;
  item: {
    localId: string;
    fileName: string;
    fileSize: number;
    progressPct: number;
    status: string;
    error?: string | null;
    videoId?: string;
  };
  onPause: () => void;
  onRetry: () => void;
  onRemove: () => void;
};

export function UploadQueueItem({ locale, item, onPause, onRetry, onRemove }: Props) {
  const fileSizeMB = (item.fileSize / 1024 / 1024).toFixed(1);

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{item.fileName}</p>
          <p className="text-xs text-muted-foreground">{fileSizeMB} MB</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Status: <span className="font-medium">{item.status}</span>
          </p>
          {item.error && (
            <p className="mt-1 text-xs text-red-600 break-words">{item.error}</p>
          )}
        </div>
        <button
          onClick={onRemove}
          className="rounded-xl border px-2 py-1 text-xs hover:bg-gray-50 dark:hover:bg-gray-800"
        >
          Remove
        </button>
      </div>

      <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-blue-500 transition-all"
          style={{ width: `${item.progressPct}%` }}
        />
      </div>

      <p className="text-xs text-muted-foreground">{item.progressPct}%</p>

      <div className="flex flex-wrap gap-2">
        {item.status === "UPLOADING" && (
          <button
            onClick={onPause}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Pause
          </button>
        )}

        {(item.status === "FAILED" || item.status === "PAUSED") && (
          <button
            onClick={onRetry}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Retry
          </button>
        )}

        {item.status === "COMPLETED" && item.videoId && (
          <Link
            href={`/${locale}/dashboard/videos/${item.videoId}/edit`}
            className="rounded-xl border px-3 py-1 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Edit Metadata
          </Link>
        )}
      </div>
    </div>
  );
}
