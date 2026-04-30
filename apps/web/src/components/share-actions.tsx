"use client";

import { useState } from "react";
import { CopyEmbedCodeButton } from "./CopyEmbedCodeButton";

export default function ShareActions({
  title,
  tagline,
  description,
  shareUrl,
  locale,
  slug,
}: {
  title: string;
  tagline: string;
  description: string;
  shareUrl: string;
  locale?: string;
  slug?: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  const caption = [title, tagline, description, shareUrl]
    .filter(Boolean)
    .join("\n\n");

  const copy = async (label: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent([title, tagline].filter(Boolean).join(" — "));

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`${title}\n${shareUrl}`)}`;
  const facebook = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  const twitter = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;

  return (
    <div className="rounded-xl border p-4 space-y-4">
      <h2 className="text-sm font-medium">Share</h2>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <a
          className="rounded-xl border px-3 py-2 text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-800"
          href={whatsapp}
          target="_blank"
          rel="noreferrer"
        >
          WhatsApp
        </a>
        <a
          className="rounded-xl border px-3 py-2 text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-800"
          href={facebook}
          target="_blank"
          rel="noreferrer"
        >
          Facebook
        </a>
        <a
          className="rounded-xl border px-3 py-2 text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-800"
          href={twitter}
          target="_blank"
          rel="noreferrer"
        >
          X
        </a>
        <a
          className="rounded-xl border px-3 py-2 text-sm text-center hover:bg-gray-50 dark:hover:bg-gray-800"
          href={linkedin}
          target="_blank"
          rel="noreferrer"
        >
          LinkedIn
        </a>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => copy("title", title)}
        >
          Copy Title
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => copy("tagline", tagline)}
        >
          Copy Tagline
        </button>
        <button
          className="rounded-xl border px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
          onClick={() => copy("caption", caption)}
        >
          Copy Caption
        </button>
      </div>

      {locale && slug && (
        <div>
          <CopyEmbedCodeButton locale={locale} slug={slug} />
        </div>
      )}

      <div className="space-y-2">
        <div className="text-xs text-muted-foreground break-all">{shareUrl}</div>
        {copied && (
          <div className="text-xs text-green-600">
            Copied {copied}
          </div>
        )}
      </div>
    </div>
  );
}
