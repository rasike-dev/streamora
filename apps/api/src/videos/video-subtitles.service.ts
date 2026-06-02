import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GcsService } from '../storage/gcs.service';

@Injectable()
export class VideoSubtitlesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gcsService: GcsService,
  ) {}

  /**
   * The controller passes the Keycloak subject (`sub`), but `video.uploaderId`
   * references the internal `User.id`. Resolve the internal id before any
   * ownership comparison.
   */
  private async resolveInternalUserId(keycloakSub: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
      select: { id: true },
    });
    if (!user) {
      throw new ForbiddenException('You cannot access this video');
    }
    return user.id;
  }

  async listSubtitles(videoId: string, userId: string) {
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        uploaderId: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const internalUserId = await this.resolveInternalUserId(userId);
    if (video.uploaderId !== internalUserId) {
      throw new ForbiddenException('You cannot access this video');
    }

    const subtitles = await this.prisma.videoSubtitle.findMany({
      where: { videoId },
      select: {
        locale: true,
        format: true,
        bucket: true,
        objectKey: true,
      },
    });

    return {
      videoId,
      tracks: subtitles.map((sub) => ({
        locale: sub.locale,
        format: sub.format,
        url: this.gcsService.getPublicUrl(sub.bucket, sub.objectKey),
      })),
    };
  }

  async uploadSubtitle(
    videoId: string,
    locale: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    // Validate video exists and user owns it
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        uploaderId: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const internalUserId = await this.resolveInternalUserId(userId);
    if (video.uploaderId !== internalUserId) {
      throw new ForbiddenException(
        'You cannot upload subtitles for this video',
      );
    }

    // Validate status - allow subtitles for READY, REJECTED, APPROVED, PUBLISHED
    const allowedStatuses = ['READY', 'REJECTED', 'APPROVED', 'PUBLISHED'];
    if (!allowedStatuses.includes(video.status)) {
      throw new BadRequestException(
        `Subtitles cannot be uploaded for videos in ${video.status} status`,
      );
    }

    // Validate file
    if (!file) {
      throw new BadRequestException('Subtitle file is required');
    }

    // Validate file extension
    const ext = file.originalname.split('.').pop()?.toLowerCase();
    if (ext !== 'vtt' && ext !== 'srt') {
      throw new BadRequestException(
        'Subtitle file must be .vtt or .srt format',
      );
    }

    // Validate file size (max 1MB)
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      throw new BadRequestException('Subtitle file must be less than 1MB');
    }

    // Determine format
    const format = ext === 'vtt' ? 'VTT' : 'SRT';

    // Upload to GCS
    const mediaBucket =
      process.env.MEDIA_BUCKET || process.env.GCS_BUCKET || 'streamora-media';
    const objectKey = `videos/${videoId}/subtitles/${locale}.${ext}`;

    await this.gcsService.upload({
      bucket: mediaBucket,
      objectKey,
      buffer: file.buffer,
      contentType: ext === 'vtt' ? 'text/vtt' : 'text/srt',
    });

    // Create or update subtitle record
    await this.prisma.videoSubtitle.upsert({
      where: {
        videoId_locale: {
          videoId,
          locale,
        },
      },
      update: {
        format,
        bucket: mediaBucket,
        objectKey,
      },
      create: {
        videoId,
        locale,
        format,
        bucket: mediaBucket,
        objectKey,
      },
    });

    return {
      success: true,
      locale,
      format,
      url: this.gcsService.getPublicUrl(mediaBucket, objectKey),
    };
  }

  async deleteSubtitle(videoId: string, locale: string, userId: string) {
    // Validate video exists and user owns it
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        uploaderId: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const internalUserId = await this.resolveInternalUserId(userId);
    if (video.uploaderId !== internalUserId) {
      throw new ForbiddenException(
        'You cannot delete subtitles for this video',
      );
    }

    // Find subtitle
    const subtitle = await this.prisma.videoSubtitle.findUnique({
      where: {
        videoId_locale: {
          videoId,
          locale,
        },
      },
    });

    if (!subtitle) {
      throw new NotFoundException('Subtitle not found');
    }

    // Delete from GCS
    try {
      await this.gcsService.delete(subtitle.bucket, subtitle.objectKey);
    } catch (error) {
      // Log error but continue with DB deletion
      console.error('Failed to delete subtitle from GCS:', error);
    }

    // Delete from database
    await this.prisma.videoSubtitle.delete({
      where: {
        videoId_locale: {
          videoId,
          locale,
        },
      },
    });

    return { success: true, locale };
  }

  async getPublicSubtitles(videoId: string) {
    const subtitles = await this.prisma.videoSubtitle.findMany({
      where: { videoId },
      select: {
        locale: true,
        format: true,
        bucket: true,
        objectKey: true,
      },
    });

    return subtitles.map((sub) => ({
      locale: sub.locale,
      url: this.gcsService.getPublicUrl(sub.bucket, sub.objectKey),
    }));
  }
}
