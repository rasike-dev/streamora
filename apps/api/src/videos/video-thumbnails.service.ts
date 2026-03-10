import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'crypto';

const THUMBNAIL_EDITABLE_STATUSES = [
  'READY',
  'REJECTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
  'PROCESSING_FAILED',
];

@Injectable()
export class CreatorVideoThumbnailsService {
  private readonly storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
  });
  private readonly thumbnailsBucket = process.env.GCS_BUCKET_THUMBNAILS || process.env.GCS_BUCKET_ORIGINALS!;

  constructor(private readonly prisma: PrismaService) {}

  private async getOwnedVideo(videoId: string, keycloakSub: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        uploaderId: user.id,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (!THUMBNAIL_EDITABLE_STATUSES.includes(video.status)) {
      throw new BadRequestException('Video thumbnails are not editable in current status');
    }

    return video;
  }

  private toPublicUrl(bucket: string, objectKey: string) {
    const base = process.env.PUBLIC_ASSET_BASE_URL;
    if (base) return `${base}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async list(videoId: string, keycloakSub: string) {
    await this.getOwnedVideo(videoId, keycloakSub);

    const thumbnails = await this.prisma.videoThumbnail.findMany({
      where: { videoId },
      orderBy: [{ isSelected: 'desc' }, { createdAt: 'asc' }],
    });

    return {
      videoId,
      selectedThumbnailId: thumbnails.find((x) => x.isSelected)?.id ?? null,
      items: thumbnails.map((x) => ({
        id: x.id,
        source: x.source,
        isSelected: x.isSelected,
        objectKey: x.objectKey,
        url: this.toPublicUrl(x.bucket, x.objectKey),
      })),
    };
  }

  async select(videoId: string, thumbnailId: string, keycloakSub: string) {
    await this.getOwnedVideo(videoId, keycloakSub);

    const thumb = await this.prisma.videoThumbnail.findFirst({
      where: {
        id: thumbnailId,
        videoId,
      },
    });

    if (!thumb) {
      throw new NotFoundException('Thumbnail not found');
    }

    await this.prisma.$transaction([
      this.prisma.videoThumbnail.updateMany({
        where: { videoId, isSelected: true },
        data: { isSelected: false },
      }),
      this.prisma.videoThumbnail.update({
        where: { id: thumbnailId },
        data: { isSelected: true },
      }),
    ]);

    return { success: true };
  }

  async uploadCustom(
    videoId: string,
    keycloakSub: string,
    file: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
  ) {
    await this.getOwnedVideo(videoId, keycloakSub);

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only JPEG, PNG, and WebP thumbnails are allowed');
    }

    const extension =
      file.mimetype === 'image/png'
        ? 'png'
        : file.mimetype === 'image/webp'
        ? 'webp'
        : 'jpg';

    const objectKey = `videos/${videoId}/thumbnails/custom/${randomUUID()}.${extension}`;

    const bucket = this.storage.bucket(this.thumbnailsBucket);
    const gcsFile = bucket.file(objectKey);

    await gcsFile.save(file.buffer, {
      resumable: false,
      metadata: {
        contentType: file.mimetype,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    const created = await this.prisma.$transaction(async (tx) => {
      await tx.videoThumbnail.updateMany({
        where: { videoId, isSelected: true },
        data: { isSelected: false },
      });

      return tx.videoThumbnail.create({
        data: {
          videoId,
          bucket: this.thumbnailsBucket,
          objectKey,
          isSelected: true,
          source: 'CUSTOM',
        },
      });
    });

    return {
      success: true,
      thumbnail: {
        id: created.id,
        source: created.source,
        isSelected: created.isSelected,
        objectKey: created.objectKey,
        url: this.toPublicUrl(created.bucket, created.objectKey),
      },
    };
  }
}
