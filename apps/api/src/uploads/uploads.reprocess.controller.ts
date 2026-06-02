import {
  BadRequestException,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { PubsubService } from '../events/pubsub.service';

/**
 * Re-triggers processing for a video whose original file is already in GCS but
 * never got a `video.uploaded` event published (e.g. uploaded under the old
 * broken complete flow). Moves the video back to UPLOADED and republishes.
 */
@Controller()
export class VideoReprocessController {
  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
    private pubsub: PubsubService,
  ) {}

  @Post('creator/videos/:id/reprocess')
  @UseGuards(JwtGuard)
  async reprocess(@Req() req: any, @Param('id') videoId: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub: sub },
    });
    if (!user) throw new NotFoundException('User not found');

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });
    if (!video) throw new NotFoundException('Video not found');

    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');
    if (!isAdmin && video.uploaderId && video.uploaderId !== user.id) {
      throw new ForbiddenException('Not allowed');
    }

    // Most recent completed upload intent for this video.
    const intent = await this.prisma.uploadIntent.findFirst({
      where: { videoId, status: 'COMPLETED' },
      orderBy: { completedAt: 'desc' },
    });
    if (!intent) {
      throw new BadRequestException(
        'No completed upload found for this video. Please upload the file first.',
      );
    }

    // Verify the original object actually exists in storage.
    const bucket = this.gcs.bucket(intent.bucket);
    const file = bucket.file(intent.objectKey);
    const [exists] = await file.exists();
    if (!exists) {
      throw new BadRequestException(
        'Original file not found in storage. Please re-upload.',
      );
    }

    const [meta] = await file.getMetadata();
    const actualSize = Number(meta.size ?? 0);
    const contentType = meta.contentType || intent.contentType;

    await this.prisma.$transaction(async (tx) => {
      await tx.video.update({
        where: { id: videoId },
        data: { status: 'UPLOADED' },
      });

      await tx.videoAsset.upsert({
        where: { videoId },
        update: {
          bucket: intent.bucket,
          originalKey: intent.objectKey,
          contentType,
          sizeBytes: BigInt(actualSize),
        },
        create: {
          videoId,
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
      videoId,
      uploadIntentId: intent.id,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
      contentType,
      sizeBytes: actualSize,
      occurredAt: new Date().toISOString(),
      correlationId: req.requestId,
    });

    return { ok: true, videoId, status: 'UPLOADED' };
  }
}
