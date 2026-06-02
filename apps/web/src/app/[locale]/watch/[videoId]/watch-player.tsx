'use client';

import Hls from 'hls.js';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { UserBanner } from '@/components/layout/user-banner';

export function WatchPlayer({ videoId }: { videoId: string }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const t = useTranslations('watchPage');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${api}/videos/${videoId}/playback`);
      if (!res.ok) {
        setErr(t('playbackNotReady', { status: res.status }));
        return;
      }
      const data = await res.json();
      setMasterUrl(data.masterUrl);
    };
    load();
  }, [api, videoId, t]);

  useEffect(() => {
    if (!masterUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = masterUrl;
      return;
    }

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(masterUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    }

    setErr(t('hlsUnsupported'));
  }, [masterUrl, t]);

  return (
    <div className="space-y-4">
      {err ? (
        <UserBanner variant="error" title={t('loadError')} body={err} />
      ) : null}

      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full rounded-xl border border-black/10 dark:border-white/10"
      />
      {masterUrl ? (
        <div className="break-all text-xs text-muted-foreground">{masterUrl}</div>
      ) : null}
    </div>
  );
}
