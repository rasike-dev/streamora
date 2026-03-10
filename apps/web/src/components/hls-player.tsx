"use client";

import Hls from "hls.js";
import { useEffect, useRef } from "react";

export default function HlsPlayer({
  playbackUrl,
  poster,
}: {
  playbackUrl: string | null;
  poster?: string | null;
}) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!playbackUrl || !ref.current) return;
    const video = ref.current;

    // Native HLS (Safari/iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
      return;
    }

    // hls.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    }
  }, [playbackUrl]);

  return (
    <video
      ref={ref}
      controls
      playsInline
      poster={poster || undefined}
      className="w-full rounded-xl border bg-black"
    />
  );
}
