"use client";

import {useTranslations} from "next-intl";
import {useEffect, useState} from "react";
import {useParams} from "next/navigation";
import VideoDraftForm from "@/components/video-draft-form";

export default function DashboardPage() {
  const t = useTranslations();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  const [me, setMe] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    tagline: "",
    channelIds: [] as string[],
    tags: "",
  });
  const [myVideos, setMyVideos] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const api = process.env.NEXT_PUBLIC_API_URL!;
      const token = localStorage.getItem("access_token");
      if (!token) {
        setErr("Not logged in. Go to /login");
        return;
      }

      try {
        // Load user info
        const meRes = await fetch(`${api}/me`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (!meRes.ok) {
          setErr(`Failed: ${meRes.status}`);
          return;
        }
        setMe(await meRes.json());

        // Load channels
        const channelsRes = await fetch(`${api}/channels?locale=${locale}`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (channelsRes.ok) {
          setChannels(await channelsRes.json());
        }

        // Load tags
        const tagsRes = await fetch(`${api}/tags?locale=${locale}`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (tagsRes.ok) {
          setTags(await tagsRes.json());
        }

        // Load my videos
        const videosRes = await fetch(`${api}/creator/videos`, {
          headers: {Authorization: `Bearer ${token}`},
        });
        if (videosRes.ok) {
          setMyVideos(await videosRes.json());
        }
      } catch (error) {
        setErr(`Network error: ${error instanceof Error ? error.message : String(error)}`);
        console.error("Fetch error:", error);
      }
    };
    load();
  }, [locale]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const api = process.env.NEXT_PUBLIC_API_URL!;
    const token = localStorage.getItem("access_token");

    if (!token) {
      setErr("Not logged in");
      return;
    }

    // Parse tags (comma separated)
    const tagNames = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    // Find tag IDs by name/slug
    const tagIds = tags
      .filter((tag) => tagNames.some((name) => tag.name.toLowerCase().includes(name.toLowerCase()) || tag.slug === name))
      .map((tag) => tag.id);

    try {
      const res = await fetch(`${api}/creator/videos/draft`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          title: formData.title,
          description: formData.description,
          tagline: formData.tagline,
          channelIds: formData.channelIds,
          tagIds,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        setErr(`Failed to create draft: ${errorText}`);
        return;
      }

      const video = await res.json();
      setMyVideos([video, ...myVideos]);
      setFormData({title: "", description: "", tagline: "", channelIds: [], tags: ""});
      setShowForm(false);
    } catch (error) {
      setErr(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <main className="min-h-dvh p-4">
      <h1 className="text-xl font-semibold mb-2">{t("dashboard.title")}</h1>

      {err && <p className="text-sm text-red-600 mb-4">{err}</p>}

      {me && (
        <div className="rounded-xl border p-4 mb-4">
          <div className="text-sm">User: {me.username}</div>
          <div className="text-sm">Email: {me.email ?? "-"}</div>
          <div className="text-sm">Roles: {(me.roles ?? []).join(", ")}</div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Create Draft</h2>
        <a
          href={`/${locale}/dashboard/uploads`}
          className="text-sm text-blue-600 underline"
        >
          Bulk Upload
        </a>
      </div>
      <VideoDraftForm locale={locale} />

      <div className="mb-4">
        <button
          className="rounded-xl border px-4 py-2 text-sm"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "Cancel" : t("dashboard.createDraft")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-xl border p-4 mb-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">{t("dashboard.form.title")}</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("dashboard.form.description")}
            </label>
            <textarea
              className="w-full rounded border px-3 py-2"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("dashboard.form.tagline")}</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              value={formData.tagline}
              onChange={(e) => setFormData({...formData, tagline: e.target.value})}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t("dashboard.form.channels")}
            </label>
            <div className="space-y-2">
              {channels.map((channel) => (
                <label key={channel.id} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.channelIds.includes(channel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData({
                          ...formData,
                          channelIds: [...formData.channelIds, channel.id],
                        });
                      } else {
                        setFormData({
                          ...formData,
                          channelIds: formData.channelIds.filter((id) => id !== channel.id),
                        });
                      }
                    }}
                  />
                  <span className="text-sm">{channel.name}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t("dashboard.form.tags")}</label>
            <input
              type="text"
              className="w-full rounded border px-3 py-2"
              placeholder="tag1, tag2, tag3"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
            />
          </div>

          <button type="submit" className="rounded-xl border px-4 py-2">
            {t("dashboard.form.save")}
          </button>
        </form>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-2">{t("dashboard.myVideos")}</h2>
        {myVideos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No videos yet</p>
        ) : (
          <div className="space-y-2">
            {myVideos.map((video) => {
              const translation = video.translations.find((t: any) => t.locale === locale) || video.translations[0];
              return (
                <div key={video.id} className="rounded-xl border p-4">
                  <div className="text-sm font-medium">{translation?.title || "Untitled"}</div>
                  <div className="text-xs text-muted-foreground">
                    Status: {video.status} | Visibility: {video.visibility || 'PRIVATE'} | Slug: {video.slug}
                    {video.scheduleRequested && video.scheduledAt && (
                      <span className="ml-2">| Scheduled: {new Date(video.scheduledAt).toLocaleString()}</span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {["DRAFT", "UPLOADED", "PROCESSING_FAILED", "READY", "REJECTED"].includes(
                      video.status
                    ) && (
                      <a
                        href={`/${locale}/dashboard/videos/${video.id}/edit`}
                        className="text-xs text-blue-600 underline"
                      >
                        Edit
                      </a>
                    )}
                    <a
                      href={`/${locale}/dashboard/videos/${video.id}/analytics`}
                      className="text-xs text-blue-600 underline"
                    >
                      Analytics
                    </a>
                    {video.status === "READY" && (
                      <a
                        href={`/${locale}/watch/${video.id}`}
                        className="text-xs text-blue-600 underline"
                      >
                        Watch
                      </a>
                    )}
                    {video.status === "PUBLISHED" && (
                      <a
                        href={`/${locale}/v/${video.slug}`}
                        className="text-xs text-blue-600 underline"
                        target="_blank"
                      >
                        Share Page
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
