import sharp from "sharp";
import path from "path";
import fs from "fs/promises";
import os from "os";
import { Storage } from "@google-cloud/storage";
import { PrismaClient } from "@prisma/client";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export type MediaUploadedEvent = {
  type: "media.uploaded";
  mediaItemId: string;
  kind: "IMAGE" | "DOCUMENT";
  uploadIntentId: string;
  bucket: string;
  objectKey: string;
  contentType?: string;
  sizeBytes?: number;
  jobType: "IMAGE_DERIVATIVES" | "DOC_THUMBNAIL";
  occurredAt: string;
  correlationId?: string;
};

export async function processMediaMessage(
  evt: MediaUploadedEvent,
  deps: {
    prisma: PrismaClient;
    storage: Storage;
  },
) {
  const { prisma, storage } = deps;
  const correlationId =
    evt.correlationId || `media-job-${evt.mediaItemId}-${Date.now()}`;

  const existingRunning = await prisma.processingJob.findFirst({
    where: { mediaItemId: evt.mediaItemId, status: "RUNNING" },
    orderBy: { createdAt: "desc" },
  });
  if (existingRunning) {
    console.log(
      `[${correlationId}] Skipping duplicate media job for ${evt.mediaItemId}`,
    );
    return;
  }

  const pendingJob = await prisma.processingJob.findFirst({
    where: {
      mediaItemId: evt.mediaItemId,
      uploadIntentId: evt.uploadIntentId,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
  });

  const job = pendingJob
    ? await prisma.processingJob.update({
        where: { id: pendingJob.id },
        data: {
          status: "RUNNING",
          attempts: { increment: 1 },
          correlationId,
          startedAt: new Date(),
        },
      })
    : await prisma.processingJob.create({
        data: {
          mediaItemId: evt.mediaItemId,
          uploadIntentId: evt.uploadIntentId,
          jobType: evt.jobType,
          status: "RUNNING",
          attempts: 1,
          correlationId,
          startedAt: new Date(),
        },
      });

  await prisma.mediaItem.update({
    where: { id: evt.mediaItemId },
    data: { status: "PROCESSING" },
  });

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "streamora-media-"));
  const localPath = path.join(tmpDir, "input");
  const bucket = storage.bucket(evt.bucket);
  const file = bucket.file(evt.objectKey);
  const [exists] = await file.exists();
  if (!exists) {
    throw new Error(`Media original not found: gs://${evt.bucket}/${evt.objectKey}`);
  }

  await file.download({ destination: localPath });

  try {
    if (evt.kind === "IMAGE") {
      await processImageDerivatives({
        evt,
        localPath,
        bucket,
        prisma,
      });
    } else {
      await processDocumentThumbnail({
        evt,
        localPath,
        bucket,
        prisma,
      });
    }

    await prisma.mediaItem.update({
      where: { id: evt.mediaItemId },
      data: { status: "READY" },
    });

    await prisma.processingJob.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        completedAt: new Date(),
        lastError: null,
      },
    });
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function processImageDerivatives(opts: {
  evt: MediaUploadedEvent;
  localPath: string;
  bucket: ReturnType<Storage["bucket"]>;
  prisma: PrismaClient;
}) {
  const { evt, localPath, bucket, prisma } = opts;
  const previewKey = `images/${evt.mediaItemId}/preview.webp`;
  const thumbnailKey = `images/${evt.mediaItemId}/thumb.webp`;

  const image = sharp(localPath, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  const previewBuffer = await sharp(localPath, { failOn: "none" })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  const thumbBuffer = await sharp(localPath, { failOn: "none" })
    .rotate()
    .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await bucket.file(previewKey).save(previewBuffer, {
    resumable: false,
    metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000" },
  });
  await bucket.file(thumbnailKey).save(thumbBuffer, {
    resumable: false,
    metadata: { contentType: "image/webp", cacheControl: "public, max-age=31536000" },
  });

  await prisma.mediaAsset.update({
    where: { mediaItemId: evt.mediaItemId },
    data: {
      width,
      height,
      previewKey,
      thumbnailKey,
    },
  });
}

async function processDocumentThumbnail(opts: {
  evt: MediaUploadedEvent;
  localPath: string;
  bucket: ReturnType<Storage["bucket"]>;
  prisma: PrismaClient;
}) {
  const { evt, localPath, bucket, prisma } = opts;
  const contentType = (evt.contentType || "").toLowerCase();
  let thumbnailKey: string | null = null;
  let pageCount: number | null = null;

  if (contentType.includes("pdf")) {
    const thumbPath = path.join(path.dirname(localPath), "thumb.jpg");
    try {
      await execFileAsync("pdftoppm", [
        "-f",
        "1",
        "-l",
        "1",
        "-jpeg",
        "-singlefile",
        localPath,
        path.join(path.dirname(localPath), "thumb"),
      ]);
      const generated = `${path.join(path.dirname(localPath), "thumb")}.jpg`;
      await fs.rename(generated, thumbPath).catch(async () => {
        if (await fileExists(thumbPath)) return;
        throw new Error("PDF thumbnail not generated");
      });

      const thumbBuffer = await sharp(thumbPath)
        .resize({ width: 400, height: 400, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      thumbnailKey = `documents/${evt.mediaItemId}/thumb.jpg`;
      await bucket.file(thumbnailKey).save(thumbBuffer, {
        resumable: false,
        metadata: { contentType: "image/jpeg", cacheControl: "public, max-age=31536000" },
      });
    } catch (err) {
      console.warn(`PDF thumbnail generation skipped for ${evt.mediaItemId}:`, err);
    }

    try {
      const { stdout } = await execFileAsync("pdfinfo", [localPath]);
      const match = stdout.match(/Pages:\s+(\d+)/i);
      if (match) pageCount = Number(match[1]);
    } catch {
      // optional
    }
  }

  await prisma.mediaAsset.update({
    where: { mediaItemId: evt.mediaItemId },
    data: {
      thumbnailKey,
      pageCount,
    },
  });
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}
