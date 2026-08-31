"use client";

import { useMemo, useState } from "react";
import { updateVideoSchedule } from "@/lib/api/video-schedule";
import {
  isScheduleEditable,
  scheduleDisabledReason,
} from "@/lib/video-editability";

type Props = {
  videoId: string;
  scheduledAt?: string | null;
  status: string;
};

function toLocalInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export function VideoScheduleEditor({
  videoId,
  scheduledAt,
  status,
}: Props) {
  const [value, setValue] = useState(toLocalInputValue(scheduledAt));
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const canEdit = useMemo(() => isScheduleEditable(status), [status]);
  const disabledReason = useMemo(() => scheduleDisabledReason(status), [status]);

  const handleSave = async () => {
    if (!value) {
      setError("Please select a date and time");
      return;
    }

    setUpdating(true);
    setError(null);
    setMessage(null);

    try {
      const iso = new Date(value).toISOString();
      await updateVideoSchedule(videoId, iso);
      setMessage("Schedule saved ✅");
      setTimeout(() => setMessage(null), 2000);
    } catch (e: any) {
      setError(e.message || "Failed to update schedule");
    } finally {
      setUpdating(false);
    }
  };

  const handleClear = async () => {
    setUpdating(true);
    setError(null);
    setMessage(null);

    try {
      await updateVideoSchedule(videoId, null);
      setValue("");
      setMessage("Schedule cleared ✅");
      setTimeout(() => setMessage(null), 2000);
    } catch (e: any) {
      setError(e.message || "Failed to clear schedule");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Scheduled Publishing</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Pick a future date and time. The video will publish automatically after approval.
        </p>
        {!canEdit && disabledReason ? (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-400">
            {disabledReason}
          </p>
        ) : null}
      </div>

      <div className={`space-y-3 ${!canEdit ? "opacity-60" : ""}`}>
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={!canEdit || updating}
          className="w-full rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!canEdit || updating || !value}
            onClick={handleSave}
            className="rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {updating ? "Saving..." : "Save Schedule"}
          </button>

          <button
            type="button"
            disabled={!canEdit || updating || !scheduledAt}
            onClick={handleClear}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50"
          >
            Clear Schedule
          </button>
        </div>

        {scheduledAt ? (
          <p className="text-xs text-muted-foreground">
            Current scheduled publish time: {new Date(scheduledAt).toLocaleString()}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            No publish schedule set.
          </p>
        )}

        {message && (
          <p className="text-xs text-green-600">{message}</p>
        )}

        {error && (
          <p className="text-xs text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
}
