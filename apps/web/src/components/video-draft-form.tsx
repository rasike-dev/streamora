"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";

type Channel = { id: string; slug: string; name: string };
type Tag = { id: string; slug: string; name: string };

export default function VideoDraftForm({ locale }: { locale: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagline, setTagline] = useState("");
  const [audience, setAudience] = useState("");
  const [channelIds, setChannelIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);

  useEffect(() => {
    fetch(`${api}/channels?locale=${locale}`)
      .then((r) => r.json())
      .then(setChannels)
      .catch(() => {});

    fetch(`${api}/tags?locale=${locale}`)
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, [api, locale]);

  const toggle = (arr: string[], value: string, setter: (v: string[]) => void) => {
    if (arr.includes(value)) setter(arr.filter((x) => x !== value));
    else setter([...arr, value]);
  };

  const submit = async () => {
    if (!getAccessToken()) {
      setMessage("Not logged in");
      return;
    }

    const res = await apiFetch(`/creator/videos/draft`, {
      method: "POST",
      body: JSON.stringify({
        locale,
        title,
        description,
        tagline,
        audience,
        channelIds,
        tagIds,
      }),
    });

    if (!res.ok) {
      setMessage(`Failed: ${await res.text()}`);
      return;
    }

    const data = await res.json();
    setMessage(`Draft created ✅ Video ID: ${data.id}`);
    
    // Reset form
    setTitle("");
    setDescription("");
    setTagline("");
    setAudience("");
    setChannelIds([]);
    setTagIds([]);
  };

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <h2 className="text-lg font-semibold">Create Draft</h2>

      <input
        className="w-full rounded-xl border p-2"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      <textarea
        className="w-full rounded-xl border p-2"
        placeholder="Description"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={4}
      />

      <input
        className="w-full rounded-xl border p-2"
        placeholder="Tagline"
        value={tagline}
        onChange={(e) => setTagline(e.target.value)}
      />

      <input
        className="w-full rounded-xl border p-2"
        placeholder="Audience"
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
      />

      <div className="space-y-2">
        <div className="text-sm font-medium">Channels</div>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-xl border px-3 py-1 text-sm ${
                channelIds.includes(c.id) ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
              }`}
              onClick={() => toggle(channelIds, c.id, setChannelIds)}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="text-sm font-medium">Tags</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-xl border px-3 py-1 text-sm ${
                tagIds.includes(t.id) ? "bg-blue-100 dark:bg-blue-900 font-semibold" : ""
              }`}
              onClick={() => toggle(tagIds, t.id, setTagIds)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      <button className="rounded-xl border px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800" onClick={submit}>
        Save Draft
      </button>

      {message && <div className="text-sm text-muted-foreground">{message}</div>}
    </div>
  );
}
