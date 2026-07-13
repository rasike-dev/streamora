import {
  BadRequestException,
  Controller,
  NotFoundException,
  Post,
  Param,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { getRolesFromRequest } from '../auth/auth-user.util';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { PubsubService } from '../events/pubsub.service';
import { validateUploadedMediaContent } from '../media/media-policy.util';

@Controller()
export class UploadCompleteV2Controller {
  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
    private pubsub: PubsubService,
  ) {}

  @Post('uploads/:id/complete')
  @UseGuards(JwtGuard)
  async complete(@Req() req: any, @Param('id') uploadIntentId: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { externalId: sub },
    });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id: uploadIntentId },
      include: { video: true, mediaItem: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    const roles = getRolesFromRequest(req);
    const isAdmin = roles.includes('ADMIN');

    if (intent.targetKind === 'MEDIA') {
      if (
        !isAdmin &&
        intent.mediaItem?.uploaderId &&
        intent.mediaItem.uploaderId !== user.id
      ) {
        throw new ForbiddenException('Not allowed');
      }
    } else if (
      !isAdmin &&
      intent.video?.uploaderId &&
      intent.video.uploaderId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    if (intent.status === 'COMPLETED') {
      return { ok: true, alreadyCompleted: true };
    }

    const bucket = this.gcs.bucket(intent.bucket);
    const file = bucket.file(intent.objectKey);
    const [exists] = await file.exists();
    if (!exists) throw new BadRequestException('GCS object not found');

    const [meta] = await file.getMetadata();
    const actualSize = Number(meta.size ?? 0);
    const expectedSize = Number(intent.sizeBytes);
    if (expectedSize > 0 && actualSize !== expectedSize) {
      throw new BadRequestException(
        `Size mismatch. expected=${expectedSize} actual=${actualSize}`,
      );
    }

    let contentType = meta.contentType || intent.contentType;

    if (intent.targetKind === 'MEDIA' && intent.mediaItem) {
      const [buffer] = await file.download({ start: 0, end: Math.min(actualSize, 8192) - 1 });
      contentType = await validateUploadedMediaContent(
        intent.mediaItem.kind,
        contentType,
        buffer,
      );
    }

    if (intent.targetKind === 'MEDIA' && intent.mediaItemId) {
      return this.completeMediaUpload(req, intent, contentType, actualSize);
    }

    return this.completeVideoUpload(req, intent, contentType, actualSize);
  }

  private async completeVideoUpload(
    req: any,
    intent: any,
    contentType: string,
    actualSize: number,
  ) {
    await this.prisma.$transaction(async (tx) => {
      await tx.uploadIntent.update({
        where: { id: intent.id },
        data: {
          status: 'COMPLETED',
          uploadedBytes: intent.sizeBytes,
          completedAt: new Date(),
          lastError: null,
        },
      });

      await tx.video.update({
        where: { id: intent.videoId },
        data: { status: 'UPLOADED' },
      });

      await tx.videoAsset.upsert({
        where: { videoId: intent.videoId },
        update: {
          bucket: intent.bucket,
          originalKey: intent.objectKey,
          contentType,
          sizeBytes: BigInt(actualSize),
        },
        create: {
          videoId: intent.videoId,
          bucket: intent.bucket,
          originalKey: intent.objectKey,
          contentType,
          sizeBytes: BigInt(actualSize),
        },
      });
    });

    const topic = process.env.PUBSUB_TOPIC_VIDEO_UPLOADED!;
    if (!topic) {
      throw new BadRequestException('Missing PUBSUB_TOPIC_VIDEO_UPLOADED');
    }

    await this.pubsub.publish(topic, {
      type: 'video.uploaded',
      videoId: intent.videoId,
      uploadIntentId: intent.id,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
      contentType,
      sizeBytes: actualSize,
      occurredAt: new Date().toISOString(),
      correlationId: req.requestId,
    });

    return {
      ok: true,
      targetKind: 'VIDEO',
      videoId: intent.videoId,
      uploadIntentId: intent.id,
      objectKey: intent.objectKey,
    };
  }

  private async completeMediaUpload(
    req: any,
    intent: any,
    contentType: string,
    actualSize: number,
  ) {
    const jobType =
      intent.mediaItem?.kind === 'IMAGE' ? 'IMAGE_DERIVATIVES' : 'DOC_THUMBNAIL';

    await this.prisma.$transaction(async (tx) => {
      await tx.uploadIntent.update({
        where: { id: intent.id },
        data: {
          status: 'COMPLETED',
          uploadedBytes: intent.sizeBytes,
          completedAt: new Date(),
          lastError: null,
        },
      });

      await tx.mediaItem.update({
        where: { id: intent.mediaItemId },
        data: { status: 'UPLOADED' },
      });

      await tx.mediaAsset.upsert({
        where: { mediaItemId: intent.mediaItemId },
        update: {
          bucket: intent.bucket,
          originalKey: intent.objectKey,
          contentType,
          sizeBytes: BigInt(actualSize),
          originalFilename: intent.originalFilename,
        },
        create: {
          mediaItemId: intent.mediaItemId,
          bucket: intent.bucket,
          originalKey: intent.objectKey,
          contentType,
          sizeBytes: BigInt(actualSize),
          originalFilename: intent.originalFilename,
        },
      });

      await tx.processingJob.create({
        data: {
          mediaItemId: intent.mediaItemId,
          uploadIntentId: intent.id,
          jobType,
          status: 'PENDING',
        },
      });
    });

    const topic =
      process.env.PUBSUB_TOPIC_MEDIA_UPLOADED || 'media.uploaded';

    await this.pubsub.publish(topic, {
      type: 'media.uploaded',
      mediaItemId: intent.mediaItemId,
      kind: intent.mediaItem?.kind,
      uploadIntentId: intent.id,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
      contentType,
      sizeBytes: actualSize,
      jobType,
      occurredAt: new Date().toISOString(),
      correlationId: req.requestId,
    });

    return {
      ok: true,
      targetKind: 'MEDIA',
      mediaItemId: intent.mediaItemId,
      uploadIntentId: intent.id,
      objectKey: intent.objectKey,
    };
  }
}
