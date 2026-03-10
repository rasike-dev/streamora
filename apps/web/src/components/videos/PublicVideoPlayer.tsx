"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { trackVideoEvent, VideoTrafficSource } from "@/lib/analytics/video-analytics";

type Props = {
  videoId: string;
  playbackUrl: string;
  posterUrl?: string | null;
  locale: string;
  trafficSource: VideoTrafficSource;
};

export function PublicVideoPlayer({
  videoId,
  playbackUrl,
  posterUrl,
  locale,
  trafficSource,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const startedRef = useRef(false);
  const completionRef = useRef(false);
  const milestonesRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let hls: Hls | null = null;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = playbackUrl;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
    } else {
      video.src = playbackUrl;
    }

    const onPlay = () => {
      if (!startedRef.current) {
        startedRef.current = true;
        void trackVideoEvent({
          videoId,
          eventType: "PLAY_START",
          trafficSource,
          locale,
          progressPercent: 0,
          positionSeconds: 0,
          durationSeconds: video.duration || undefined,
        });
      }
    };

    const onTimeUpdate = () => {
      if (!video.duration || Number.isNaN(video.duration) || video.duration <= 0) {
        return;
      }

      const pct = (video.currentTime / video.duration) * 100;
      const milestones = [25, 50, 75];

      for (const m of milestones) {
        if (pct >= m && !milestonesRef.current.has(m)) {
          milestonesRef.current.add(m);
          void trackVideoEvent({
            videoId,
            eventType: "HEARTBEAT",
            trafficSource,
            locale,
            progressPercent: m,
            positionSeconds: video.currentTime,
            durationSeconds: video.duration,
          });
        }
      }

      if (pct >= 90 && !completionRef.current) {
        completionRef.current = true;
        void trackVideoEvent({
          videoId,
          eventType: "PLAY_COMPLETE",
          trafficSource,
          locale,
          progressPercent: pct,
          positionSeconds: video.currentTime,
          durationSeconds: video.duration,
        });
      }
    };

    const onEnded = () => {
      if (!completionRef.current) {
        completionRef.current = true;
        void trackVideoEvent({
          videoId,
          eventType: "PLAY_COMPLETE",
          trafficSource,
          locale,
          progressPercent: 100,
          positionSeconds: video.duration,
          durationSeconds: video.duration,
        });
      }
    };

    video.addEventListener("play", onPlay);
    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);

    return () => {
      video.removeEventListener("play", onPlay);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
      if (hls) hls.destroy();
    };
  }, [videoId, playbackUrl, locale, trafficSource]);

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      poster={posterUrl ?? undefined}
      className="w-full rounded-2xl bg-black"
    />
  );
}
