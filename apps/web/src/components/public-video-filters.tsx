"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type Channel = { id: string; slug: string; name: string };
type Tag = { id: string; slug: string; name: string };

export default function PublicVideoFilters({ locale }: { locale: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const router = useRouter();
  const searchParams = useSearchParams();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetch(`${api}/channels?locale=${locale}`).then((r) => r.json()).then(setChannels).catch(() => {});
    fetch(`${api}/tags?locale=${locale}`).then((r) => r.json()).then(setTags).catch(() => {});
  }, [api, locale]);

  const currentChannel = searchParams.get("channel") || "";
  const currentTag = searchParams.get("tag") || "";

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <div>
        <div className="text-sm font-medium mb-2">Channel</div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-3 py-1 text-sm ${
              !currentChannel ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
            }`}
            onClick={() => setFilter("channel", "")}
          >
            All
          </button>
          {channels.map((c) => (
            <button
              key={c.id}
              className={`rounded-xl border px-3 py-1 text-sm ${
                currentChannel === c.slug ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
              }`}
              onClick={() => setFilter("channel", c.slug)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-2">Tag</div>
        <div className="flex flex-wrap gap-2">
          <button
            className={`rounded-xl border px-3 py-1 text-sm ${
              !currentTag ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
            }`}
            onClick={() => setFilter("tag", "")}
          >
            All
          </button>
          {tags.map((t) => (
            <button
              key={t.id}
              className={`rounded-xl border px-3 py-1 text-sm ${
                currentTag === t.slug ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
              }`}
              onClick={() => setFilter("tag", t.slug)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
