"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  PageFrame,
  PageHeading,
  UserBanner,
} from "@/components/layout";
import { listVideoSubtitles, uploadSubtitle, deleteSubtitle } from "@/lib/api/video-subtitles";

type SubtitleTrack = {
  locale: string;
  format: string;
  url: string;
};

type SubtitleListResponse = {
  videoId: string;
  tracks: SubtitleTrack[];
};

const LOCALES = [
  { code: "en", name: "English" },
  { code: "si", name: "Sinhala" },
  { code: "ta", name: "Tamil" },
];

export default function VideoSubtitlesPage() {
  const params = useParams();
  const router = useRouter();
  const videoId = params.id as string;
  const locale = (params.locale as string) || "en";
  const tCommon = useTranslations("common");

  const [subtitles, setSubtitles] = useState<SubtitleListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadSubtitles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listVideoSubtitles(videoId);
      setSubtitles(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadSubtitles();
  }, [loadSubtitles]);

  const handleUpload = async (localeCode: string, file: File | null) => {
    if (!file) return;

    try {
      setUploading(localeCode);
      setError(null);
      setMessage(null);
      await uploadSubtitle(videoId, localeCode, file);
      setMessage(`✅ Subtitle uploaded successfully for ${LOCALES.find((l) => l.code === localeCode)?.name || localeCode}`);
      await loadSubtitles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUploading(null);
    }
  };

  const handleDelete = async (localeCode: string) => {
    if (!confirm(`Delete subtitle for ${LOCALES.find((l) => l.code === localeCode)?.name || localeCode}?`)) {
      return;
    }

    try {
      setDeleting(localeCode);
      setError(null);
      setMessage(null);
      await deleteSubtitle(videoId, localeCode);
      setMessage(`✅ Subtitle deleted successfully`);
      await loadSubtitles();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(null);
    }
  };

  const hasSubtitle = (localeCode: string) => {
    return subtitles?.tracks.some((t) => t.locale === localeCode) || false;
  };

  const getSubtitle = (localeCode: string) => {
    return subtitles?.tracks.find((t) => t.locale === localeCode);
  };

  if (loading) {
    return (
      <PageFrame>
        <PageHeading title={tCommon("subtitles")} />
        <p className="text-sm text-muted-foreground">{tCommon("loading")}</p>
      </PageFrame>
    );
  }

  return (
    <PageFrame>
      <PageHeading
        title={tCommon("subtitles")}
        actions={
          <button
            type="button"
            onClick={() =>
              router.push(`/${locale}/dashboard/videos/${videoId}/edit`)
            }
            className="rounded-xl border border-black/15 px-3 py-2 text-sm hover:bg-black/[0.04] dark:border-white/15 dark:hover:bg-white/[0.06]"
          >
            {tCommon("editVideo")}
          </button>
        }
        backHref={`/${locale}/dashboard/videos/${videoId}/edit`}
        backLabel={tCommon("editVideo")}
      />

      {error ? (
        <div className="mb-4">
          <UserBanner variant="error" title={error} />
        </div>
      ) : null}

      {message ? (
        <div className="mb-4">
          <UserBanner variant="success" title={message} />
        </div>
      ) : null}

      <div className="space-y-4">
        {LOCALES.map((loc) => {
          const hasTrack = hasSubtitle(loc.code);
          const track = getSubtitle(loc.code);

          return (
            <div
              key={loc.code}
              className="space-y-3 rounded-xl border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">
                  {loc.name} ({loc.code})
                </div>
                {hasTrack && (
                  <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                    ✔ Uploaded
                  </span>
                )}
                {!hasTrack && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                    ❌ Not uploaded
                  </span>
                )}
              </div>

              {hasTrack && track && (
                <div className="text-xs text-muted-foreground">
                  Format: {track.format} •{" "}
                  <a
                    href={track.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    View file
                  </a>
                </div>
              )}

              <div className="flex gap-2">
                <label className="rounded-xl border px-3 py-1 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900">
                  {hasTrack ? "Replace" : "Upload"}
                  <input
                    type="file"
                    accept=".vtt,.srt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUpload(loc.code, file);
                      }
                    }}
                    disabled={uploading === loc.code}
                  />
                </label>
                {hasTrack && (
                  <button
                    onClick={() => handleDelete(loc.code)}
                    disabled={deleting === loc.code}
                    className="rounded-xl border px-3 py-1 text-sm bg-red-50 hover:bg-red-100 dark:bg-red-950 dark:hover:bg-red-900 disabled:opacity-50"
                  >
                    {deleting === loc.code ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>

              {uploading === loc.code && (
                <div className="text-xs text-muted-foreground">Uploading...</div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.04]">
        <div className="font-medium mb-2">Supported Formats</div>
        <ul className="list-disc list-inside space-y-1 text-muted-foreground">
          <li>WebVTT (.vtt) - Recommended</li>
          <li>SubRip (.srt)</li>
        </ul>
        <div className="mt-2 text-muted-foreground">
          Maximum file size: 1MB
        </div>
      </div>
    </PageFrame>
  );
}
