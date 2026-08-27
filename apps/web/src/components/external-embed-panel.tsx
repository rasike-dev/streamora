"use client";

import { useState } from "react";
import { apiFetch, readApiError } from "@/lib/api";

type ExternalEmbed = {
  provider: string;
  canonicalUrl: string;
  embedUrl: string;
  validationStatus: string;
  lastValidatedAt?: string | null;
  lastValidationError?: string | null;
  unavailableSince?: string | null;
};

type Props = {
  videoId: string;
  externalEmbed: ExternalEmbed;
  onUpdated?: () => void;
};

const statusLabel: Record<string, string> = {
  PENDING: "Checking link…",
  ACTIVE: "Link verified",
  UNAVAILABLE: "Source video removed or unavailable",
  ERROR: "Could not verify link",
};

export function ExternalEmbedPanel({ videoId, externalEmbed, onUpdated }: Props) {
  const [input, setInput] = useState(externalEmbed.canonicalUrl);
  const [embed, setEmbed] = useState(externalEmbed);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/creator/videos/${videoId}/external-embed/revalidate`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      if (data.externalEmbed) setEmbed(data.externalEmbed);
      setMessage("Link re-checked.");
      onUpdated?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Revalidation failed");
    } finally {
      setLoading(false);
    }
  };

  const updateLink = async () => {
    setLoading(true);
    setMessage("");
    try {
      const res = await apiFetch(`/creator/videos/${videoId}/external-embed`, {
        method: "PATCH",
        body: JSON.stringify({ input: input.trim() }),
      });
      if (!res.ok) throw new Error(await readApiError(res));
      const data = await res.json();
      if (data.externalEmbed) setEmbed(data.externalEmbed);
      setMessage("External link updated.");
      onUpdated?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Update failed");
    } finally {
      setLoading(false);
    }
  };

  const statusClass =
    embed.validationStatus === "ACTIVE"
      ? "text-green-700 dark:text-green-400"
      : embed.validationStatus === "UNAVAILABLE"
        ? "text-amber-700 dark:text-amber-400"
        : "text-red-700 dark:text-red-400";

  return (
    <div className="space-y-3 rounded-2xl border border-black/10 bg-black/[0.02] p-4 dark:border-white/10 dark:bg-white/[0.04]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">External video source</h3>
          <p className="text-xs text-muted-foreground">
            Provider: {embed.provider}. Playback is embedded from the original site — we do not host the file.
          </p>
        </div>
        <span className={`text-xs font-medium ${statusClass}`}>
          {statusLabel[embed.validationStatus] ?? embed.validationStatus}
        </span>
      </div>

      {embed.lastValidationError ? (
        <p className="text-xs text-muted-foreground">{embed.lastValidationError}</p>
      ) : null}

      {message ? <p className="text-xs">{message}</p> : null}

      <label className="block space-y-1">
        <span className="text-xs font-medium">Source URL</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={updateLink}
          disabled={loading || !input.trim()}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium dark:border-white/15"
        >
          Update link
        </button>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium dark:border-white/15"
        >
          Re-check now
        </button>
      </div>

      {embed.lastValidatedAt ? (
        <p className="text-xs text-muted-foreground">
          Last checked: {new Date(embed.lastValidatedAt).toLocaleString()}
        </p>
      ) : null}
    </div>
  );
}
