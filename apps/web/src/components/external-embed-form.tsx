"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, readApiError } from "@/lib/api";

type Props = {
  locale: string;
};

export function ExternalEmbedForm({ locale }: Props) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const res = await apiFetch("/creator/videos/external-embed", {
        method: "POST",
        body: JSON.stringify({
          input: input.trim(),
          locale,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          tagline: tagline.trim() || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(await readApiError(res));
      }

      const video = await res.json();
      router.push(`/${locale}/dashboard/videos/${video.id}/edit`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add external video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {message ? (
        <div className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          {message}
        </div>
      ) : null}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Video URL or embed code</span>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={4}
          required
          placeholder="Paste a YouTube, Facebook, or Vimeo link — or iframe embed code"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
        <span className="text-xs text-muted-foreground">
          We validate the link immediately and re-check it every day. Removed videos are flagged automatically.
        </span>
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Title</span>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Tagline</span>
        <input
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
      </label>

      <label className="block space-y-1">
        <span className="text-sm font-medium">Description</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-black"
        />
      </label>

      <button
        type="submit"
        disabled={loading || !input.trim()}
        className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {loading ? "Validating…" : "Add external video"}
      </button>
    </form>
  );
}
