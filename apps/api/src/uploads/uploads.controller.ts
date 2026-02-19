import { Body, Controller, Post, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { GcsService } from '../storage/gcs.service';
import * as crypto from 'crypto';

function safeExt(filename: string) {
  const idx = filename.lastIndexOf('.');
  if (idx < 0) return '';
  const ext = filename.slice(idx).toLowerCase();
  return ext.length <= 10 ? ext : '';
}

@Controller()
export class UploadsController {
  constructor(
    private prisma: PrismaService,
    private gcs: GcsService
  ) {}

  @Post('uploads/init')
  @UseGuards(JwtGuard)
  async initUpload(
    @Req() req: any,
    @Body() body: { videoId: string; filename: string; contentType: string; sizeBytes: number; uploadIntentId?: string }
  ) {
    const { videoId, filename, contentType, sizeBytes } = body;

    if (!videoId || !filename || !contentType || !sizeBytes) {
      throw new BadRequestException('videoId, filename, contentType, sizeBytes are required');
    }

    // Ensure video exists and user owns it (creator-side)
    const userSub = req.user?.sub;
    const user = await this.prisma.user.findUnique({ where: { keycloakSub: userSub } });
    if (!user) throw new BadRequestException('User not found in DB (call /me first)');

    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new BadRequestException('Video not found');

    // Ownership check: either uploaderId is null (draft not yet assigned) or matches
    if (video.uploaderId && video.uploaderId !== user.id) {
      throw new BadRequestException('Not owner of this video');
    }

    // Basic size policy hook (tune later)
    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isPending = roles.includes('CREATOR_PENDING');
    const maxBytes = isPending ? 250 * 1024 * 1024 : 2 * 1024 * 1024 * 1024; // 250MB vs 2GB
    if (sizeBytes > maxBytes) {
      throw new BadRequestException(`File too large for your role (max ${maxBytes} bytes)`);
    }

    const bucketName = process.env.GCS_BUCKET_ORIGINALS!;
    if (!bucketName) throw new BadRequestException('Missing GCS_BUCKET_ORIGINALS env var');

    let objectKey: string;
    let intentId: string | undefined;

    if (body.uploadIntentId) {
      // RESUME PATH (reuse objectKey)
      const existing = await this.prisma.uploadIntent.findUnique({
        where: { id: body.uploadIntentId },
        include: { video: true },
      });
      if (!existing) throw new BadRequestException('uploadIntentId not found');
      if (existing.videoId !== videoId) throw new BadRequestException('uploadIntentId does not match videoId');
      if (existing.status === 'COMPLETED') throw new BadRequestException('Upload already completed');
      // ownership already ensured by video check; but double-check:
      if (existing.video.uploaderId && existing.video.uploaderId !== user.id) {
        throw new BadRequestException('Not owner of this upload');
      }

      objectKey = existing.objectKey;
      intentId = existing.id;

      // Update intent metadata if needed (contentType/size changes generally shouldn't happen on resume)
      await this.prisma.uploadIntent.update({
        where: { id: existing.id },
        data: {
          status: 'INITIATED',
          contentType,
          sizeBytes: BigInt(sizeBytes),
          uploadedBytes: BigInt(0), // optional: reset (recommended for "re-upload" resume)
          lastError: null,
          startedAt: null,
          completedAt: null,
        },
      });
    } else {
      // NEW INTENT PATH
      const ext = safeExt(filename);
      const rand = crypto.randomBytes(8).toString('hex');
      objectKey = `originals/${videoId}/${Date.now()}-${rand}${ext}`;

      const created = await this.prisma.uploadIntent.create({
        data: {
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

    // Create resumable upload session URL for the chosen objectKey
    const bucket = this.gcs.bucket(bucketName);
    const file = bucket.file(objectKey);

    const [sessionUrl] = await file.createResumableUpload({
      origin: 'http://localhost:3000', // ok for dev; in prod use your domain
      metadata: {
        contentType,
      },
    });

    // Attach uploaderId if not set yet (bind draft to uploader)
    if (!video.uploaderId) {
      await this.prisma.video.update({
        where: { id: videoId },
        data: { uploaderId: user.id },
      });
    }

    return {
      uploadIntentId: intentId,
      videoId,
      objectKey,
      bucket: bucketName,
      resumableSessionUrl: sessionUrl,
      expiresInSeconds: 60 * 60, // FYI hint; session URLs are typically usable for some time
    };
  }
}
