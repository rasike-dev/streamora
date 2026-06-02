"use client";

import Image from "next/image";
import { useRef, useState, useEffect, useCallback } from "react";
import {
  getVideoThumbnails,
  selectVideoThumbnail,
  uploadCustomThumbnail,
} from "@/lib/api/video-thumbnails";

type Props = {
  locale: string;
  videoId: string;
};

type ThumbnailItem = {
  id: string;
  source: string;
  isSelected: boolean;
  objectKey: string;
  url: string;
};

type ThumbnailsData = {
  videoId: string;
  selectedThumbnailId: string | null;
  items: ThumbnailItem[];
};

export function ThumbnailPicker({ locale, videoId }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [data, setData] = useState<ThumbnailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [selecting, setSelecting] = useState<string | null>(null);

  const loadThumbnails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getVideoThumbnails(videoId);
      setData(result);
    } catch (e: any) {
      setError(e.message || "Failed to load thumbnails");
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadThumbnails();
  }, [loadThumbnails]);

  const handleSelect = async (thumbnailId: string) => {
    try {
      setSelecting(thumbnailId);
      await selectVideoThumbnail(videoId, thumbnailId);
      await loadThumbnails();
    } catch (e: any) {
      alert(`Failed to select thumbnail: ${e.message}`);
    } finally {
      setSelecting(null);
    }
  };

  const handleUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);
      await uploadCustomThumbnail(videoId, file);
      await loadThumbnails();
    } catch (e: any) {
      setError(e.message || "Failed to upload thumbnail");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Loading thumbnails...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="rounded-xl border border-red-500 bg-red-50 dark:bg-red-900/20 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Thumbnail Picker</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose an auto-generated thumbnail or upload a custom one.
            </p>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="rounded-xl bg-black dark:bg-white text-white dark:text-black px-4 py-2 text-sm font-medium hover:opacity-90 disabled:opacity-50"
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Custom"}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.currentTarget.value = "";
          }}
        />
      </div>

      {error && (
        <div className="rounded-xl border border-red-500 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!data || data.items.length === 0 ? (
        <div className="rounded-xl border p-4 text-sm text-muted-foreground text-center">
          No thumbnails available yet.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {data.items.map((item) => {
            const active = item.isSelected;
            const isSelecting = selecting === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`overflow-hidden rounded-xl border text-left transition ${
                  active
                    ? "ring-2 ring-blue-500 border-blue-500"
                    : "hover:border-gray-400"
                } ${isSelecting ? "opacity-50" : ""}`}
                disabled={isSelecting || active}
              >
                <div className="aspect-video w-full bg-gray-100 dark:bg-gray-800">
                  <Image
                    src={item.url}
                    alt="Thumbnail preview"
                    width={640}
                    height={360}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                </div>

                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">
                      {item.source === "CUSTOM" ? "Custom" : "Auto"}
                    </span>
                    {active ? (
                      <span className="rounded-full border border-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 text-xs text-blue-600 dark:text-blue-400">
                        Selected
                      </span>
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        Recommended: 1280×720, JPG/PNG/WebP, under 5 MB.
      </div>
    </div>
  );
}
