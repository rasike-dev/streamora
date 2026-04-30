'use client';

import { useState } from 'react';

export function CopyEmbedCodeButton({
  locale,
  slug,
}: {
  locale: string;
  slug: string;
}) {
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const code = `<iframe
  src="${baseUrl}/${locale}/embed/${slug}"
  width="640"
  height="360"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
></iframe>`;

    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={onCopy}
      className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-800"
    >
      {copied ? 'Copied!' : 'Copy Embed Code'}
    </button>
  );
}
