'use client';

import { useState } from 'react';
import { createOrGetShareLink } from '@/lib/api/share-links';

export function CopyShareLinkButton({ videoId }: { videoId: string }) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onClick = async () => {
    try {
      setLoading(true);
      setCopied(false);

      const result = await createOrGetShareLink(videoId);
      await navigator.clipboard.writeText(result.shortUrl);

      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to create share link:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
    >
      {loading ? 'Preparing...' : copied ? 'Copied!' : 'Copy Share Link'}
    </button>
  );
}
