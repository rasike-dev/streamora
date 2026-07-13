"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getCreatorMedia,
  submitMediaForModeration,
  resubmitMedia,
  updateCreatorMedia,
  updateMediaVisibility,
} from "@/lib/api/creator-media";
import { createOrGetMediaShareLink } from "@/lib/api/media-share-links";

export function MediaEditor({
  mediaItemId,
  locale,
}: {
  mediaItemId: string;
  locale: string;
}) {
  const [data, setData] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "UNLISTED" | "PRIVATE">(
    "PRIVATE",
  );
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCreatorMedia(mediaItemId)
      .then((item) => {
        setData(item);
        const tr =
          item.translations?.find((t: any) => t.locale === locale) ||
          item.translations?.find((t: any) => t.locale === "en");
        setTitle(tr?.title || "");
        setDescription(tr?.description || "");
        setVisibility(item.visibility);
      })
      .catch((e) => setMessage(e.message))
      .finally(() => setLoading(false));
  }, [mediaItemId, locale]);

  const save = async () => {
    setMessage(null);
    try {
      const updated = await updateCreatorMedia(mediaItemId, {
        translations: [{ locale, title, description }],
      });
      setData(updated);
      setMessage("Saved.");
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const submit = async () => {
    setMessage(null);
    try {
      if (data?.status === "REJECTED") {
        await resubmitMedia(mediaItemId);
      } else {
        await submitMediaForModeration(mediaItemId);
      }
      const refreshed = await getCreatorMedia(mediaItemId);
      setData(refreshed);
      setMessage("Submitted for review.");
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const saveVisibility = async () => {
    try {
      await updateMediaVisibility(mediaItemId, visibility);
      setMessage("Visibility updated.");
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  const share = async () => {
    try {
      const link = await createOrGetMediaShareLink(mediaItemId);
      setShareUrl(link.shortUrl);
    } catch (e: any) {
      setMessage(e.message);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-sm text-red-600">{message || "Not found"}</p>;

  const asset = data.asset;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-black/10 p-4 dark:border-white/10">
        <div className="text-sm text-muted-foreground">
          {data.kind} · {data.status} · {data.visibility}
        </div>
        <div className="mt-1 text-sm">
          Views {data.views} · Downloads {data.downloads}
        </div>
        {asset ? (
          <div className="mt-3 text-sm text-muted-foreground">
            {asset.originalFilename || asset.originalKey} · {asset.contentType}
          </div>
        ) : null}
      </div>

      <div className="grid gap-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Title</span>
          <input
            className="w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted-foreground">Description</span>
          <textarea
            className="min-h-24 w-full rounded-xl border border-black/15 bg-transparent px-3 py-2 dark:border-white/15"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          onClick={save}
        >
          Save
        </button>
        {(data.status === "READY" || data.status === "REJECTED") && (
          <button
            type="button"
            className="rounded-xl bg-foreground px-4 py-2 text-sm font-medium text-background"
            onClick={submit}
          >
            {data.status === "REJECTED" ? "Resubmit" : "Submit for review"}
          </button>
        )}
        <button
          type="button"
          className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          onClick={share}
        >
          Get share link
        </button>
        <Link
          href={`/${locale}/m/${data.slug}`}
          className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
        >
          Preview
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          className="rounded-xl border border-black/15 bg-transparent px-3 py-2 text-sm dark:border-white/15"
          value={visibility}
          onChange={(e) =>
            setVisibility(e.target.value as "PUBLIC" | "UNLISTED" | "PRIVATE")
          }
        >
          <option value="PRIVATE">Private</option>
          <option value="UNLISTED">Unlisted</option>
          <option value="PUBLIC">Public</option>
        </select>
        <button
          type="button"
          className="rounded-xl border border-black/15 px-4 py-2 text-sm dark:border-white/15"
          onClick={saveVisibility}
        >
          Update visibility
        </button>
      </div>

      {shareUrl ? (
        <p className="text-sm">
          Share link:{" "}
          <a href={shareUrl} className="underline">
            {shareUrl}
          </a>
        </p>
      ) : null}
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </div>
  );
}
