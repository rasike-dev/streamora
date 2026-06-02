"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { VideoVisibilitySelector } from "@/components/videos/VideoVisibilitySelector";
import { VideoScheduleEditor } from "@/components/videos/VideoScheduleEditor";
import { CopyShareLinkButton } from "@/components/CopyShareLinkButton";
import { CopyEmbedCodeButton } from "@/components/CopyEmbedCodeButton";
import { resubmitCreatorVideo } from "@/lib/api/creator-videos";
import { apiFetch } from "@/lib/api";
import { getAccessToken } from "@/lib/auth/tokens";
import Link from "next/link";

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
  slug: string;
  status: string;
  visibility: string;
  scheduledAt?: string | null;
  scheduleRequested?: boolean;
  rejectionReason?: string | null;
  rejectionNote?: string | null;
  rejectedAt?: string | null;
  resubmittedAt?: string | null;
  moderationVersion?: number;
  takedownReason?: string | null;
  takedownNote?: string | null;
  takenDownAt?: string | null;
  takenDownBy?: string | null;
  archivedReason?: string | null;
  archivedNote?: string | null;
  archivedAt?: string | null;
  archivedBy?: string | null;
  translations: Translation[];
  channels: Array<{ channel: { slug: string; name: string } }>;
  tags: Array<{ tag: { slug: string; name: string } }>;
};

export default function VideoDraftEditor({ videoId, locale: propLocale }: { videoId: string; locale?: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const params = useParams();
  const locale = propLocale || (params.locale as string) || "en";
  const token = getAccessToken();

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
  const [isResubmitting, setIsResubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    // Load video draft
    apiFetch(`/creator/videos/${videoId}`, { cache: "no-store" })
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
      const res = await apiFetch(`/creator/videos/${videoId}`, {
        method: "PATCH",
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

      setMessage("Draft saved successfully ✅");
      setTimeout(() => setMessage(""), 5000);
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
      const res = await apiFetch(`/creator/videos/${videoId}/submit`, {
        method: "POST",
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
  const submitDisabledReason =
    video.status === "READY"
      ? ""
      : `Submit is available only when status is READY. Current status: ${video.status}.`;

  const currentTranslation = formData[activeLocale] || formData.en;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Edit Draft</h2>
        <div className="text-xs text-muted-foreground">Status: {video.status}</div>
      </div>

      {message && (
        <div
          className={`sticky top-2 z-20 rounded-xl border px-3 py-2 text-sm shadow-sm backdrop-blur ${
            message.includes("✅")
              ? "border-green-300 bg-green-50/95 text-green-700 dark:border-green-800 dark:bg-green-950/95 dark:text-green-300"
              : "border-red-300 bg-red-50/95 text-red-700 dark:border-red-800 dark:bg-red-950/95 dark:text-red-300"
          }`}
        >
          {message}
        </div>
      )}

      {video?.status === "REJECTED" && (
        <div className="space-y-4">
          <div className="border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-xl p-4 space-y-2">
            <div className="font-semibold text-red-700 dark:text-red-400">
              ❌ Rejected by Moderation
            </div>
            
            {video.rejectionReason && (
              <div className="text-sm text-red-600 dark:text-red-300">
                <strong>Reason:</strong> {video.rejectionReason}
              </div>
            )}
            
            {video.rejectionNote && (
              <div className="text-sm text-red-600 dark:text-red-300">
                <strong>Admin Notes:</strong> {video.rejectionNote}
              </div>
            )}
            
            <div className="text-xs text-red-500 dark:text-red-400 mt-2">
              Please fix the issue and resubmit your video.
            </div>
          </div>

          <button
            onClick={async () => {
              if (!token || !video) return;
              try {
                setIsResubmitting(true);
                setMessage("");
                await resubmitCreatorVideo(video.id);
                setMessage("✅ Video resubmitted for moderation");
                // Reload video data
                const res = await apiFetch(`/creator/videos/${videoId}`, {
                  cache: "no-store",
                });
                if (res.ok) {
                  const data = await res.json();
                  setVideo(data);
                }
              } catch (e: any) {
                setMessage(`Failed to resubmit: ${e.message}`);
              } finally {
                setIsResubmitting(false);
              }
            }}
            disabled={isResubmitting || !token}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-800"
          >
            {isResubmitting ? "Resubmitting..." : "Resubmit for Approval"}
          </button>
        </div>
      )}

      {video?.status === "PENDING_APPROVAL" && video?.resubmittedAt && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950 dark:border-amber-800 p-4 text-sm">
          Your video has been resubmitted and is awaiting moderation.
          {video.moderationVersion && video.moderationVersion > 1 && (
            <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
              (Revision {video.moderationVersion})
            </span>
          )}
        </div>
      )}

      {video?.status === "TAKEDOWN" && (
        <div className="border border-red-300 bg-red-50 dark:bg-red-950 dark:border-red-800 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-red-700 dark:text-red-400">
            ⚠️ Video Removed by Administration
          </div>
          {video.takedownReason && (
            <div className="text-sm text-red-600 dark:text-red-300">
              <strong>Reason:</strong> {video.takedownReason}
            </div>
          )}
          {video.takedownNote && (
            <div className="text-sm text-red-600 dark:text-red-300">
              <strong>Notes:</strong> {video.takedownNote}
            </div>
          )}
          {video.takenDownAt && (
            <div className="text-xs text-red-500 dark:text-red-400 mt-2">
              Taken down on {new Date(video.takenDownAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

      {video?.status === "ARCHIVED" && (
        <div className="border border-gray-300 bg-gray-50 dark:bg-gray-950 dark:border-gray-800 rounded-xl p-4 space-y-2">
          <div className="font-semibold text-gray-700 dark:text-gray-400">
            📦 Archived
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            This video has been archived by the platform.
          </div>
          {video.archivedReason && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Reason:</strong> {video.archivedReason}
            </div>
          )}
          {video.archivedNote && (
            <div className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Notes:</strong> {video.archivedNote}
            </div>
          )}
          {video.archivedAt && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Archived on {new Date(video.archivedAt).toLocaleString()}
            </div>
          )}
        </div>
      )}

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
            apiFetch(`/creator/videos/${videoId}`, { cache: "no-store" })
              .then((r) => r.json())
              .then((data) => setVideo(data))
              .catch(() => {});
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

        <button
          className={`rounded-xl border px-4 py-2 text-sm ${
            canSubmit
              ? "bg-blue-500 text-white hover:bg-blue-600"
              : "bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-900 dark:text-gray-400"
          }`}
          onClick={submitForModeration}
          disabled={saving || !canSubmit}
          title={!canSubmit ? submitDisabledReason : undefined}
        >
          Submit for Approval
        </button>

        {["READY", "REJECTED", "PENDING_APPROVAL", "APPROVED", "PUBLISHED"].includes(
          video.status
        ) && (
          <>
            <a
              href={`/${locale}/dashboard/videos/${videoId}/thumbnails`}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Manage Thumbnails
            </a>
            <Link
              href={`/${locale}/dashboard/videos/${videoId}/subtitles`}
              className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              Manage Subtitles
            </Link>
          </>
        )}

        <CopyShareLinkButton videoId={videoId} />
        {video?.slug && (
          <CopyEmbedCodeButton locale={locale} slug={video.slug} />
        )}
      </div>

      {!canSubmit && (
        <div className="text-xs text-muted-foreground">
          {submitDisabledReason}
        </div>
      )}

    </div>
  );
}
