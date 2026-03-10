import "dotenv/config";
import { PubSub } from "@google-cloud/pubsub";
import { Storage } from "@google-cloud/storage";
import { PrismaClient } from "@prisma/client";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs/promises";
import path from "path";
import os from "os";

const execFileAsync = promisify(execFile);

const prisma = new PrismaClient();
const pubsub = new PubSub({ projectId: process.env.GCP_PROJECT_ID });
const storage = new Storage({ projectId: process.env.GCP_PROJECT_ID });

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

type VideoUploadedEvent = {
  type: "video.uploaded";
  videoId: string;
  uploadIntentId: string;
  bucket: string;
  objectKey: string;
  contentType?: string;
  sizeBytes?: number;
  occurredAt: string;
};

async function ffprobe(filePath: string) {
  // Requires ffprobe installed in worker runtime (from ffmpeg package)
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "error",
    "-print_format", "json",
    "-show_format",
    "-show_streams",
    filePath,
  ]);

  return JSON.parse(stdout);
}

async function extractThumbnails(inputPath: string, outDir: string, timesSec: number[]) {
  // Creates thumbnails: thumb_0.jpg ... thumb_5.jpg
  // ffmpeg -ss {t} -i input -frames:v 1 -q:v 2 out.jpg
  const outputs: { timeSec: number; filePath: string }[] = [];

  for (let i = 0; i < timesSec.length; i++) {
    const t = timesSec[i];
    const out = path.join(outDir, `thumb_${i}.jpg`);
    await execFileAsync("ffmpeg", [
      "-hide_banner",
      "-loglevel", "error",
      "-ss", String(t),
      "-i", inputPath,
      "-frames:v", "1",
      "-q:v", "2",
      out,
    ]);
    outputs.push({ timeSec: t, filePath: out });
  }

  return outputs;
}

function computeThumbTimes(durationSec: number): number[] {
  // 6 thumbnails spread through the video, avoiding very start/end
  const safeStart = Math.min(5, Math.max(0, durationSec * 0.05));
  const safeEnd = Math.max(0, durationSec - Math.min(5, durationSec * 0.05));
  const span = Math.max(1, safeEnd - safeStart);

  return [0.05, 0.2, 0.35, 0.5, 0.65, 0.8].map((p) => safeStart + span * p);
}

async function uploadThumbsToGcs(videoId: string, thumbBucket: string, thumbs: { timeSec: number; filePath: string }[]) {
  const bucket = storage.bucket(thumbBucket);

  const uploaded: { timeSec: number; bucket: string; objectKey: string }[] = [];
  for (let i = 0; i < thumbs.length; i++) {
    const t = thumbs[i];
    const objectKey = `thumbs/${videoId}/thumb_${i}.jpg`;
    await bucket.upload(t.filePath, {
      destination: objectKey,
      resumable: false,
      metadata: { contentType: "image/jpeg" },
    });
    uploaded.push({ timeSec: t.timeSec, bucket: thumbBucket, objectKey });
  }

  return uploaded;
}

async function uploadDirToGcs(localDir: string, bucketName: string, prefix: string) {
  const bucket = storage.bucket(bucketName);

  const walk = async (dir: string): Promise<string[]> => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files: string[] = [];
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) files.push(...(await walk(p)));
      else files.push(p);
    }
    return files;
  };

  const files = await walk(localDir);

  for (const f of files) {
    const rel = path.relative(localDir, f).replaceAll("\\", "/");
    const objectKey = `${prefix}/${rel}`;

    const contentType =
      rel.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" :
      rel.endsWith(".ts") ? "video/mp2t" :
      "application/octet-stream";

    await bucket.upload(f, {
      destination: objectKey,
      resumable: false,
      metadata: { contentType, cacheControl: "public, max-age=31536000" },
    });
  }
}

async function generateHls(inputPath: string, outDir: string) {
  await fs.mkdir(outDir, { recursive: true });

  // Output structure:
  // outDir/master.m3u8
  // outDir/0/playlist.m3u8 + segments
  // outDir/1/playlist.m3u8 + segments

  // One-pass multi-variant HLS generation:
  await execFileAsync("ffmpeg", [
    "-hide_banner",
    "-loglevel", "error",
    "-i", inputPath,

    // Map video/audio twice for two variants
    "-filter_complex",
    [
      // scale and keep aspect ratio; pad to exact sizes
      "[0:v]split=2[v1][v2];",
      "[v1]scale=w=640:h=360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2[v360];",
      "[v2]scale=w=1280:h=720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2[v720]"
    ].join(""),

    "-map", "[v360]", "-map", "0:a:0?",
    "-map", "[v720]", "-map", "0:a:0?",

    // Encoding settings (safe defaults, tune later)
    "-c:v", "h264",
    "-profile:v", "main",
    "-crf", "20",
    "-g", "48",
    "-keyint_min", "48",
    "-sc_threshold", "0",

    "-c:a", "aac",
    "-ar", "48000",
    "-b:a", "128k",

    // Variant bitrates (rough)
    "-b:v:0", "800k",
    "-maxrate:v:0", "856k",
    "-bufsize:v:0", "1200k",

    "-b:v:1", "2800k",
    "-maxrate:v:1", "3000k",
    "-bufsize:v:1", "4200k",

    // HLS output
    "-f", "hls",
    "-hls_time", "4",
    "-hls_playlist_type", "vod",
    "-hls_flags", "independent_segments",
    "-hls_segment_type", "mpegts",
    "-hls_segment_filename", path.join(outDir, "%v", "seg_%03d.ts"),

    // create master + variant playlists
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", "v:0,a:0 v:1,a:1",

    path.join(outDir, "%v", "playlist.m3u8"),
  ]);
}

async function processMessage(evt: VideoUploadedEvent) {
  const thumbBucket = mustEnv("GCS_BUCKET_THUMBS");

  // Extract correlation ID from event or generate one
  const correlationId =
    (evt as any).correlationId ||
    `job-${evt.videoId}-${Date.now()}`;

  // Check for duplicate running job BEFORE creating new one
  const existingRunning = await prisma.processingJob.findFirst({
    where: {
      videoId: evt.videoId,
      status: "RUNNING",
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingRunning) {
    console.log(`[${correlationId}] Skipping duplicate running job for videoId=${evt.videoId}, existing job: ${existingRunning.id}`);
    return;
  }

  // Create job row at processing start
  const job = await prisma.processingJob.create({
    data: {
      videoId: evt.videoId,
      uploadIntentId: evt.uploadIntentId,
      jobType: "THUMBS_HLS",
      status: "RUNNING",
      attempts: 1,
      correlationId,
      startedAt: new Date(),
    },
  });

  // Update video status → PROCESSING
  await prisma.video.update({
    where: { id: evt.videoId },
    data: { status: "PROCESSING" },
  });

  // Download original
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "streamora-"));
  const localVideoPath = path.join(tmpDir, "input");
  const bucket = storage.bucket(evt.bucket);
  const file = bucket.file(evt.objectKey);

  const [exists] = await file.exists();
  if (!exists) throw new Error(`Original not found: gs://${evt.bucket}/${evt.objectKey}`);

  await file.download({ destination: localVideoPath });

  // ffprobe metadata
  const probe = await ffprobe(localVideoPath);
  const format = probe.format ?? {};
  const streams = probe.streams ?? [];
  const videoStream = streams.find((s: any) => s.codec_type === "video");

  const durationSec = Number(format.duration ?? 0) || 0;
  const width = videoStream?.width ? Number(videoStream.width) : null;
  const height = videoStream?.height ? Number(videoStream.height) : null;

  // Persist metadata into VideoAsset (created Day 6)
  await prisma.videoAsset.update({
    where: { videoId: evt.videoId },
    data: {
      durationSec: durationSec || null,
      width: width ?? null,
      height: height ?? null,
    },
  });

  // Extract thumbs
  const outDir = path.join(tmpDir, "thumbs");
  await fs.mkdir(outDir, { recursive: true });

  const times = computeThumbTimes(durationSec > 0 ? durationSec : 60);
  const thumbFiles = await extractThumbnails(localVideoPath, outDir, times);
  const uploadedThumbs = await uploadThumbsToGcs(evt.videoId, thumbBucket, thumbFiles);

  // Write thumbs to DB (replace any existing AUTO thumbs, preserve CUSTOM)
  // Check if there's already a selected thumbnail
  const existingSelected = await prisma.videoThumbnail.findFirst({
    where: { videoId: evt.videoId, isSelected: true },
  });

  // Delete only AUTO thumbnails, preserve CUSTOM
  // After Prisma migration is run, this will work with source: 'AUTO'
  // Until then, we need to use type assertion
  await prisma.videoThumbnail.deleteMany({
    where: { videoId: evt.videoId, source: 'AUTO' } as any,
  });

  // If no selected thumbnail exists, select the first generated one
  const shouldSelectFirst = !existingSelected;

  await prisma.videoThumbnail.createMany({
    data: uploadedThumbs.map((t, idx) => ({
      videoId: evt.videoId,
      bucket: t.bucket,
      objectKey: t.objectKey,
      timeSec: t.timeSec,
      source: 'AUTO',
      isSelected: shouldSelectFirst && idx === 0,
    })),
  });

  // --- HLS generation ---
  const renditionsBucket = mustEnv("GCS_BUCKET_RENDITIONS");
  const hlsDir = path.join(tmpDir, "hls");

  await generateHls(localVideoPath, hlsDir);

  // Upload HLS folder to GCS
  const prefix = `renditions/${evt.videoId}`;
  await uploadDirToGcs(hlsDir, renditionsBucket, prefix);

  // Persist playback pointers in DB
  const masterKey = `${prefix}/master.m3u8`;

  await prisma.videoAsset.update({
    where: { videoId: evt.videoId },
    data: {
      hlsBucket: renditionsBucket,
      hlsMasterKey: masterKey,
    },
  });

  // Upsert renditions rows (variants are 0 and 1 folders)
  await prisma.videoRendition.upsert({
    where: { videoId_quality: { videoId: evt.videoId, quality: "360p" } },
    update: { playlistKey: `${prefix}/0/playlist.m3u8`, bandwidth: 800000, width: 640, height: 360, codec: "h264+aac" },
    create: { videoId: evt.videoId, quality: "360p", playlistKey: `${prefix}/0/playlist.m3u8`, bandwidth: 800000, width: 640, height: 360, codec: "h264+aac" },
  });

  await prisma.videoRendition.upsert({
    where: { videoId_quality: { videoId: evt.videoId, quality: "720p" } },
    update: { playlistKey: `${prefix}/1/playlist.m3u8`, bandwidth: 2800000, width: 1280, height: 720, codec: "h264+aac" },
    create: { videoId: evt.videoId, quality: "720p", playlistKey: `${prefix}/1/playlist.m3u8`, bandwidth: 2800000, width: 1280, height: 720, codec: "h264+aac" },
  });

  // Video status after thumbs + HLS
  // Day 9: Set to PENDING_APPROVAL or APPROVED based on creator approval
  const video = await prisma.video.findUnique({ where: { id: evt.videoId } });
  if (!video) throw new Error("Video not found");

  let nextStatus: any = "PENDING_APPROVAL";

  if (video.uploaderId) {
    const profile = await prisma.creatorProfile.findUnique({ where: { userId: video.uploaderId } });
    if (profile?.approval === "APPROVED") nextStatus = "APPROVED";
  }

  await prisma.video.update({
    where: { id: evt.videoId },
    data: { status: nextStatus },
  });

  // Update job row on success
  await prisma.processingJob.update({
    where: { id: job.id },
    data: {
      status: "SUCCEEDED",
      completedAt: new Date(),
      lastError: null,
    },
  });

  // Cleanup
  await fs.rm(tmpDir, { recursive: true, force: true });
}

async function main() {
  const subName = mustEnv("PUBSUB_SUBSCRIPTION_VIDEO_UPLOADED");
  const subscription = pubsub.subscription(subName);

  console.log(`Streamora Worker Day07 listening on subscription: ${subName}`);

  subscription.on("message", async (message) => {
    try {
      const data = JSON.parse(message.data.toString("utf-8")) as VideoUploadedEvent;
      if (data.type !== "video.uploaded") {
        message.ack();
        return;
      }

      console.log(`Processing video.uploaded: videoId=${data.videoId}`);
      await processMessage(data);

      message.ack();
      console.log(`Done: videoId=${data.videoId}`);
    } catch (err: any) {
      console.error("Worker error:", err?.message || err);

      // Mark intent/video failed (simple; improve later with retries/DLQ)
      try {
        const raw = JSON.parse(message.data.toString("utf-8")) as Partial<VideoUploadedEvent>;
        if (raw.videoId) {
          await prisma.video.update({
            where: { id: raw.videoId as string },
            data: { status: "REJECTED" }, // or introduce PROCESSING_FAILED later
          });
        }
      } catch {}

      // Nack so it can retry (default behavior)
      message.nack();
    }
  });

  subscription.on("error", (e) => {
    console.error("Subscription error:", e);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
