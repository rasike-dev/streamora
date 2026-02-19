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
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';
import { PubsubService } from '../events/pubsub.service';

@Controller()
export class UploadCompleteV2Controller {
  constructor(
    private prisma: PrismaService,
    private gcs: GcsService,
    private pubsub: PubsubService
  ) {}

  @Post('uploads/:id/complete')
  @UseGuards(JwtGuard)
  async complete(@Req() req: any, @Param('id') uploadIntentId: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({ where: { keycloakSub: sub } });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id: uploadIntentId },
      include: { video: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');
    if (!isAdmin && intent.video.uploaderId && intent.video.uploaderId !== user.id) {
      throw new ForbiddenException('Not allowed');
    }

    if (intent.status === 'COMPLETED') {
      return { ok: true, alreadyCompleted: true };
    }

    // Verify object exists in GCS
    const bucket = this.gcs.bucket(intent.bucket);
    const file = bucket.file(intent.objectKey);

    const [exists] = await file.exists();
    if (!exists) throw new BadRequestException('GCS object not found');

    const [meta] = await file.getMetadata();
    const actualSize = Number(meta.size ?? 0);
    const expectedSize = Number(intent.sizeBytes);

    // size check (strict)
    if (expectedSize > 0 && actualSize !== expectedSize) {
      throw new BadRequestException(`Size mismatch. expected=${expectedSize} actual=${actualSize}`);
    }

    const contentType = meta.contentType || intent.contentType;

    // Update DB atomically
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

    // Publish event to Pub/Sub (worker consumes Day 7)
    const topic = process.env.PUBSUB_TOPIC_VIDEO_UPLOADED!;
    if (!topic) throw new BadRequestException('Missing PUBSUB_TOPIC_VIDEO_UPLOADED');

    await this.pubsub.publish(topic, {
      type: 'video.uploaded',
      videoId: intent.videoId,
      uploadIntentId: intent.id,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
      contentType,
      sizeBytes: actualSize,
      occurredAt: new Date().toISOString(),
    });

    return {
      ok: true,
      videoId: intent.videoId,
      uploadIntentId: intent.id,
      objectKey: intent.objectKey,
    };
  }
}
