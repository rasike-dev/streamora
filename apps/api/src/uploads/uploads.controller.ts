import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { MediaKind } from '@prisma/client';
import { getRolesFromRequest } from '../auth/auth-user.util';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { GcsService } from '../storage/gcs.service';
import * as crypto from 'crypto';
import {
  assertAllowedContentType,
  buildMediaObjectKey,
  DAILY_UPLOAD_LIMITS,
  getMaxBytesForMedia,
  getMediaBucket,
  sanitizeFilename,
  safeExt,
} from '../media/media-policy.util';

@Controller()
export class UploadsController {
  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
  ) {}

  @Post('uploads/init')
  @UseGuards(JwtGuard)
  async initUpload(
    @Req() req: any,
    @Body()
    body: {
      videoId?: string;
      mediaItemId?: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      uploadIntentId?: string;
    },
  ) {
    const { videoId, mediaItemId, filename, contentType, sizeBytes } = body;

    if ((!videoId && !mediaItemId) || !filename || !contentType || !sizeBytes) {
      throw new BadRequestException(
        'videoId or mediaItemId, filename, contentType, sizeBytes are required',
      );
    }
    if (videoId && mediaItemId) {
      throw new BadRequestException('Provide either videoId or mediaItemId, not both');
    }

    const userSub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { externalId: userSub },
    });
    if (!user) {
      throw new BadRequestException('User not found in DB (call /me first)');
    }

    const roles = getRolesFromRequest(req);
    const isPending = roles.includes('CREATOR_PENDING');

    if (mediaItemId) {
      return this.initMediaUpload(req, user, {
        mediaItemId,
        filename,
        contentType,
        sizeBytes,
        uploadIntentId: body.uploadIntentId,
        isPending,
      });
    }

    return this.initVideoUpload(req, user, {
      videoId: videoId!,
      filename,
      contentType,
      sizeBytes,
      uploadIntentId: body.uploadIntentId,
      isPending,
    });
  }

  private async initVideoUpload(
    req: any,
    user: { id: string },
    body: {
      videoId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      uploadIntentId?: string;
      isPending: boolean;
    },
  ) {
    const { videoId, filename, contentType, sizeBytes } = body;

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new BadRequestException('Video not found');
    if (video.uploaderId && video.uploaderId !== user.id) {
      throw new BadRequestException('Not owner of this video');
    }

    const maxBytes = body.isPending
      ? 250 * 1024 * 1024
      : 2 * 1024 * 1024 * 1024;
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(
        `File too large for your role (max ${maxBytes} bytes)`,
      );
    }

    await this.assertDailyQuota(user.id, body.isPending, 'VIDEO');

    const bucketName = process.env.GCS_BUCKET_ORIGINALS!;
    if (!bucketName) {
      throw new BadRequestException('Missing GCS_BUCKET_ORIGINALS env var');
    }

    let objectKey: string;
    let intentId: string | undefined;

    if (body.uploadIntentId) {
      const existing = await this.prisma.uploadIntent.findUnique({
        where: { id: body.uploadIntentId },
        include: { video: true },
      });
      if (!existing || existing.videoId !== videoId) {
        throw new BadRequestException('uploadIntentId not found or mismatched');
      }
      if (existing.status === 'COMPLETED') {
        throw new BadRequestException('Upload already completed');
      }
      if (existing.video?.uploaderId && existing.video.uploaderId !== user.id) {
        throw new BadRequestException('Not owner of this upload');
      }
      objectKey = existing.objectKey;
      intentId = existing.id;
      await this.prisma.uploadIntent.update({
        where: { id: existing.id },
        data: {
          status: 'INITIATED',
          contentType,
          sizeBytes: BigInt(sizeBytes),
          uploadedBytes: BigInt(0),
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
      });
    } else {
      const ext = safeExt(filename);
      const rand = crypto.randomBytes(8).toString('hex');
      objectKey = `originals/${videoId}/${Date.now()}-${rand}${ext}`;
      const created = await this.prisma.uploadIntent.create({
        data: {
          targetKind: 'VIDEO',
          videoId,
          objectKey,
          bucket: bucketName,
          contentType,
          sizeBytes: BigInt(sizeBytes),
          status: 'INITIATED',
          uploadedBytes: BigInt(0),
        },
      });
      intentId = created.id;
    }

    const sessionUrl = await this.createResumableSession(
      bucketName,
      objectKey,
      contentType,
    );

    if (!video.uploaderId) {
      await this.prisma.video.update({
        where: { id: videoId },
        data: { uploaderId: user.id },
      });
    }

    return {
      uploadIntentId: intentId,
      targetKind: 'VIDEO',
      videoId,
      objectKey,
      bucket: bucketName,
      resumableSessionUrl: sessionUrl,
      expiresInSeconds: 60 * 60,
    };
  }

  private async initMediaUpload(
    req: any,
    user: { id: string },
    body: {
      mediaItemId: string;
      filename: string;
      contentType: string;
      sizeBytes: number;
      uploadIntentId?: string;
      isPending: boolean;
    },
  ) {
    const { mediaItemId, filename, contentType, sizeBytes } = body;

    const mediaItem = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
    });
    if (!mediaItem) throw new BadRequestException('Media item not found');
    if (mediaItem.uploaderId && mediaItem.uploaderId !== user.id) {
      throw new BadRequestException('Not owner of this media item');
    }

    assertAllowedContentType(mediaItem.kind, contentType);

    const maxBytes = getMaxBytesForMedia(mediaItem.kind, body.isPending);
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(
        `File too large for your role (max ${maxBytes} bytes)`,
      );
    }

    await this.assertDailyQuota(user.id, body.isPending, 'MEDIA');

    const bucketName = getMediaBucket();
    const safeName = sanitizeFilename(filename);
    let objectKey: string;
    let intentId: string | undefined;

    if (body.uploadIntentId) {
      const existing = await this.prisma.uploadIntent.findUnique({
        where: { id: body.uploadIntentId },
        include: { mediaItem: true },
      });
      if (!existing || existing.mediaItemId !== mediaItemId) {
        throw new BadRequestException('uploadIntentId not found or mismatched');
      }
      if (existing.status === 'COMPLETED') {
        throw new BadRequestException('Upload already completed');
      }
      if (
        existing.mediaItem?.uploaderId &&
        existing.mediaItem.uploaderId !== user.id
      ) {
        throw new BadRequestException('Not owner of this upload');
      }
      objectKey = existing.objectKey;
      intentId = existing.id;
      await this.prisma.uploadIntent.update({
        where: { id: existing.id },
        data: {
          status: 'INITIATED',
          contentType,
          sizeBytes: BigInt(sizeBytes),
          originalFilename: safeName,
          uploadedBytes: BigInt(0),
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
      });
    } else {
      objectKey = buildMediaObjectKey(mediaItem.kind, mediaItemId, filename);
      const created = await this.prisma.uploadIntent.create({
        data: {
          targetKind: 'MEDIA',
          mediaItemId,
          objectKey,
          bucket: bucketName,
          contentType,
          sizeBytes: BigInt(sizeBytes),
          originalFilename: safeName,
          status: 'INITIATED',
          uploadedBytes: BigInt(0),
        },
      });
      intentId = created.id;
    }

    const sessionUrl = await this.createResumableSession(
      bucketName,
      objectKey,
      contentType,
    );

    if (!mediaItem.uploaderId) {
      await this.prisma.mediaItem.update({
        where: { id: mediaItemId },
        data: { uploaderId: user.id },
      });
    }

    return {
      uploadIntentId: intentId,
      targetKind: 'MEDIA',
      mediaItemId,
      kind: mediaItem.kind,
      objectKey,
      bucket: bucketName,
      resumableSessionUrl: sessionUrl,
      expiresInSeconds: 60 * 60,
    };
  }

  private async assertDailyQuota(
    userId: string,
    isPending: boolean,
    target: 'VIDEO' | 'MEDIA',
  ) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const maxUploadsPerDay = isPending
      ? DAILY_UPLOAD_LIMITS.pending
      : DAILY_UPLOAD_LIMITS.approved;

    const where =
      target === 'VIDEO'
        ? {
            video: { uploaderId: userId },
            createdAt: { gte: startOfDay },
            status: {
              in: ['INITIATED', 'UPLOADING', 'COMPLETED'] as (
                | 'INITIATED'
                | 'UPLOADING'
                | 'COMPLETED'
              )[],
            },
          }
        : {
            mediaItem: { uploaderId: userId },
            createdAt: { gte: startOfDay },
            status: {
              in: ['INITIATED', 'UPLOADING', 'COMPLETED'] as (
                | 'INITIATED'
                | 'UPLOADING'
                | 'COMPLETED'
              )[],
            },
          };

    const count = await this.prisma.uploadIntent.count({ where });
    if (count >= maxUploadsPerDay) {
      throw new BadRequestException(
        `Daily upload limit reached (${maxUploadsPerDay})`,
      );
    }
  }

  private async createResumableSession(
    bucketName: string,
    objectKey: string,
    contentType: string,
  ) {
    const bucket = this.gcs.bucket(bucketName);
    const file = bucket.file(objectKey);
    const resumableOrigin =
      process.env.UPLOAD_RESUMABLE_ORIGIN?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.ALLOWED_ORIGINS?.split(',')
        .map((origin) => origin.trim())
        .find(Boolean);

    const [sessionUrl] = await file.createResumableUpload({
      ...(resumableOrigin ? { origin: resumableOrigin } : {}),
      metadata: { contentType },
    });
    return sessionUrl;
  }
}
