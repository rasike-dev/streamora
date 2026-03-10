"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoVisibilitySelector } from "@/components/videos/VideoVisibilitySelector";
import { VideoScheduleEditor } from "@/components/videos/VideoScheduleEditor";

type Translation = {
  locale: string;
  title?: string | null;
  description?: string | null;
  tagline?: string | null;
  audience?: string | null;
};

type Channel = { id: string; slug: string; name: string };
type Tag = { id: string; slug: string; name: string };

type VideoDraft = {
  id: string;
  status: string;
  visibility: string;
  scheduledAt?: string | null;
  scheduleRequested?: boolean;
  translations: Translation[];
  channels: Array<{ channel: { slug: string; name: string } }>;
  tags: Array<{ tag: { slug: string; name: string } }>;
};

export default function VideoDraftEditor({ videoId }: { videoId: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = useParams();
  const locale = propLocale || (params.locale as string) || "en";
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const [video, setVideo] = useState<VideoDraft | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activeLocale, setActiveLocale] = useState<string>(locale);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state per locale
  const [formData, setFormData] = useState<Record<string, Translation>>({
    en: { locale: "en", title: "", description: "", tagline: "", audience: "" },
    si: { locale: "si", title: "", description: "", tagline: "", audience: "" },
    ta: { locale: "ta", title: "", description: "", tagline: "", audience: "" },
  });

  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;

    // Load video draft
    fetch(`${api}/creator/videos/${videoId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        setVideo(data);

        // Populate form data from translations
        const translations: Record<string, Translation> = {
          en: { locale: "en", title: "", description: "", tagline: "", audience: "" },
          si: { locale: "si", title: "", description: "", tagline: "", audience: "" },
          ta: { locale: "ta", title: "", description: "", tagline: "", audience: "" },
        };

        data.translations?.forEach((t: Translation) => {
          translations[t.locale] = {
            locale: t.locale,
            title: t.title || "",
            description: t.description || "",
            tagline: t.tagline || "",
            audience: t.audience || "",
          };
        });

        setFormData(translations);
        setSelectedChannels(data.channels?.map((c: any) => c.channel.slug) || []);
        setSelectedTags(data.tags?.map((t: any) => t.tag.slug) || []);
        setLoading(false);
      })
      .catch((e) => {
        setMessage(`Failed to load: ${e.message}`);
        setLoading(false);
      });

    // Load channels and tags
    fetch(`${api}/channels?locale=${locale}`)
      .then((r) => r.json())
      .then(setChannels)
      .catch(() => {});

    fetch(`${api}/tags?locale=${locale}`)
      .then((r) => r.json())
      .then(setTags)
      .catch(() => {});
  }, [api, videoId, token, locale]);

  const updateTranslation = (loc: string, field: keyof Translation, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [loc]: { ...prev[loc], [field]: value },
    }));
  };

  const toggleChannel = (slug: string) => {
    setSelectedChannels((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const toggleTag = (slug: string) => {
    setSelectedTags((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  };

  const saveDraft = async () => {
    if (!token) {
      setMessage("Not logged in");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${api}/creator/videos/${videoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          translations: Object.values(formData).filter(
            (t) => t.title || t.description || t.tagline
          ),
          channels: selectedChannels,
          tags: selectedTags,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      setMessage("Draft saved ✅");
      setTimeout(() => setMessage(""), 2000);
    } catch (e: any) {
      setMessage(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const submitForModeration = async () => {
    if (!token) {
      setMessage("Not logged in");
      return;
    }

    if (!confirm("Submit this video for moderation? It will be reviewed by an admin.")) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const res = await fetch(`${api}/creator/videos/${videoId}/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText);
      }

      setMessage("Submitted for moderation ✅");
      // Reload video to get updated status
      window.location.reload();
    } catch (e: any) {
      setMessage(`Failed to submit: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading...</div>;
  }

  if (!video) {
    return <div className="text-sm text-red-600">Video not found</div>;
  }

  const editable = ["DRAFT", "UPLOADED", "PROCESSING_FAILED", "READY", "REJECTED"].includes(
    video.status
  );
  const canSubmit = video.status === "READY";

  const currentTranslation = formData[activeLocale] || formData.en;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit Draft</h2>
        <div className="text-xs text-muted-foreground">Status: {video.status}</div>
      </div>

      {!editable && (
        <div className="rounded-xl border border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 p-3 text-sm">
          This video is not editable in its current status ({video.status})
        </div>
      )}

      {/* Language Tabs */}
      <div className="flex gap-2 border-b">
        {["en", "si", "ta"].map((loc) => (
          <button
            key={loc}
            className={`px-4 py-2 text-sm ${
              activeLocale === loc
                ? "border-b-2 border-blue-500 font-semibold"
                : "text-muted-foreground"
            }`}
            onClick={() => setActiveLocale(loc)}
          >
            {loc.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Translation Fields */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Title</label>
          <input
            className="w-full rounded-xl border p-2"
            value={currentTranslation.title || ""}
            onChange={(e) => updateTranslation(activeLocale, "title", e.target.value)}
            disabled={!editable}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            className="w-full rounded-xl border p-2"
            rows={4}
            value={currentTranslation.description || ""}
            onChange={(e) => updateTranslation(activeLocale, "description", e.target.value)}
            disabled={!editable}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Tagline</label>
          <input
            className="w-full rounded-xl border p-2"
            value={currentTranslation.tagline || ""}
            onChange={(e) => updateTranslation(activeLocale, "tagline", e.target.value)}
            disabled={!editable}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Audience</label>
          <input
            className="w-full rounded-xl border p-2"
            placeholder="GENERAL, KIDS, 18+"
            value={currentTranslation.audience || ""}
            onChange={(e) => updateTranslation(activeLocale, "audience", e.target.value)}
            disabled={!editable}
          />
        </div>
      </div>

      {/* Channels */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Channels</div>
        <div className="flex flex-wrap gap-2">
          {channels.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`rounded-xl border px-3 py-1 text-sm ${
                selectedChannels.includes(c.slug)
                  ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                  : ""
              }`}
              onClick={() => editable && toggleChannel(c.slug)}
              disabled={!editable}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div className="space-y-2">
        <div className="text-sm font-medium">Tags</div>
        <div className="flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`rounded-xl border px-3 py-1 text-sm ${
                selectedTags.includes(t.slug)
                  ? "bg-blue-100 dark:bg-blue-900 font-semibold"
                  : ""
              }`}
              onClick={() => editable && toggleTag(t.slug)}
              disabled={!editable}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Visibility Selector */}
      {editable && video && (
        <VideoVisibilitySelector
          videoId={videoId}
          value={(video.visibility as any) || 'PRIVATE'}
          onUpdate={() => {
            // Reload video data to get updated visibility
            if (token) {
              fetch(`${api}/creator/videos/${videoId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
                .then((r) => r.json())
                .then((data) => setVideo(data))
                .catch(() => {});
            }
          }}
        />
      )}

      {/* Schedule Editor */}
      {editable && video && (
        <VideoScheduleEditor
          videoId={videoId}
          scheduledAt={video.scheduledAt}
          status={video.status}
        />
      )}

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <button
          className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={saveDraft}
          disabled={!editable || saving}
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>

        {canSubmit && (
          <button
            className="rounded-xl border px-4 py-2 text-sm bg-blue-500 text-white hover:bg-blue-600"
            onClick={submitForModeration}
            disabled={saving}
          >
            Submit for Approval
          </button>
        )}

        {["READY", "REJECTED", "PENDING_APPROVAL", "APPROVED", "PUBLISHED"].includes(
          video.status
        ) && (
          <a
            href={`/${locale}/dashboard/videos/${videoId}/thumbnails`}
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Manage Thumbnails
          </a>
        )}
      </div>

      {message && (
        <div className={`text-sm ${message.includes("✅") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </div>
      )}
    </div>
  );
}
