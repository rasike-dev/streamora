"use client";

import Hls from "hls.js";
import { useEffect, useRef, useState } from "react";

export default function WatchPage({ params }: { params: { locale: string; videoId: string } }) {
  const api = process.env.NEXT_PUBLIC_API_URL!;
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`${api}/videos/${params.videoId}/playback`);
      if (!res.ok) {
        setErr(`Playback not ready (${res.status})`);
        return;
      }
      const data = await res.json();
      setMasterUrl(data.masterUrl);
    };
    load();
  }, [api, params.videoId]);

  useEffect(() => {
    if (!masterUrl || !videoRef.current) return;
    const video = videoRef.current;

    // Native HLS (Safari/iOS)
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = masterUrl;
      return;
    }

    // hls.js for other browsers
    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(masterUrl);
      hls.attachMedia(video);
      return () => hls.destroy();
    } else {
      setErr("HLS not supported in this browser.");
    }
  }, [masterUrl]);

  return (
    <main className="min-h-dvh p-4 space-y-4">
      <h1 className="text-xl font-semibold">Watch</h1>

      {err && <div className="text-sm text-red-600">{err}</div>}

      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full rounded-xl border"
      />
      {masterUrl && (
        <div className="text-xs text-muted-foreground break-all">
          {masterUrl}
        </div>
      )}
    </main>
  );
}
