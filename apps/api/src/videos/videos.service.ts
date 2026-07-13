import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatorVideosQueryService } from './creator-videos-query.service';

@Injectable()
export class VideosService {
  constructor(
    private prisma: PrismaService,
    private queryService: CreatorVideosQueryService,
  ) {}

  async createDraft(
    externalId: string,
    data: {
      locale: string;
      title?: string;
      description?: string;
      tagline?: string;
      channelIds?: string[];
      tagIds?: string[];
    },
    requestId?: string,
  ) {
    if (requestId) {
      console.log(`[${requestId}] creator.videos.draft.create start`, {
        externalId,
        locale: data.locale,
      });
    }

    // Find user by externalId
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate slug (simple timestamp-based for now)
    const slug = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create video
    const video = await this.prisma.video.create({
      data: {
        slug,
        status: 'DRAFT',
        visibility: 'PRIVATE',
        uploaderId: user.id,
        uploaderVisible: false,
        translations: {
          create: {
            locale: data.locale || 'en',
            title: data.title,
            description: data.description,
            tagline: data.tagline,
          },
        },
        channels: data.channelIds
          ? {
              create: data.channelIds.map((channelId) => ({
                channelId,
              })),
            }
          : undefined,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({
                tagId,
              })),
            }
          : undefined,
      },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
    });

    return video;
  }

  async updateDraft(
    videoId: string,
    externalId: string,
    data: {
      locale?: string;
      title?: string;
      description?: string;
      tagline?: string;
      channelIds?: string[];
      tagIds?: string[];
    },
  ) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Find video and verify ownership
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.uploaderId !== user.id) {
      throw new ForbiddenException('Not authorized to update this video');
    }

    const locale = data.locale || 'en';

    // Update or create translation
    await this.prisma.videoTranslation.upsert({
      where: {
        videoId_locale: {
          videoId,
          locale,
        },
      },
      update: {
        title: data.title,
        description: data.description,
        tagline: data.tagline,
      },
      create: {
        videoId,
        locale,
        title: data.title,
        description: data.description,
        tagline: data.tagline,
      },
    });

    // Update channels if provided
    if (data.channelIds !== undefined) {
      await this.prisma.videoChannel.deleteMany({
        where: { videoId },
      });
      if (data.channelIds.length > 0) {
        await this.prisma.videoChannel.createMany({
          data: data.channelIds.map((channelId) => ({
            videoId,
            channelId,
          })),
        });
      }
    }

    // Update tags if provided
    if (data.tagIds !== undefined) {
      await this.prisma.videoTag.deleteMany({
        where: { videoId },
      });
      if (data.tagIds.length > 0) {
        await this.prisma.videoTag.createMany({
          data: data.tagIds.map((tagId) => ({
            videoId,
            tagId,
          })),
        });
      }
    }

    // Return updated video
    return this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  async findByUploader(externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      return [];
    }

    return this.prisma.video.findMany({
      where: { uploaderId: user.id },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDraft(videoId: string, externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        uploaderId: user.id,
      },
      select: {
        id: true,
        slug: true,
        status: true,
        visibility: true,
        scheduledAt: true,
        scheduleRequested: true,
        rejectionReason: true,
        rejectionNote: true,
        rejectedAt: true,
        resubmittedAt: true,
        moderationVersion: true,
        takedownReason: true,
        takedownNote: true,
        takenDownAt: true,
        takenDownBy: true,
        archivedReason: true,
        archivedNote: true,
        archivedAt: true,
        archivedBy: true,
        createdAt: true,
        updatedAt: true,
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    return video;
  }

  async updateDraftFull(
    videoId: string,
    externalId: string,
    data: {
      translations?: Array<{
        locale: 'en' | 'si' | 'ta';
        title?: string;
        description?: string;
        tagline?: string;
        audience?: string;
      }>;
      channels?: string[];
      tags?: string[];
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: { id: videoId, uploaderId: user.id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Check if video is editable
    const editable = [
      'DRAFT',
      'UPLOADED',
      'PROCESSING_FAILED',
      'READY',
      'REJECTED',
    ];
    if (!editable.includes(video.status)) {
      throw new BadRequestException('Video not editable in current status');
    }

    await this.prisma.$transaction(async (tx) => {
      // Update translations
      if (data.translations) {
        for (const t of data.translations) {
          await tx.videoTranslation.upsert({
            where: {
              videoId_locale: {
                videoId,
                locale: t.locale,
              },
            },
            update: {
              title: t.title ?? null,
              description: t.description ?? null,
              tagline: t.tagline ?? null,
              audience: t.audience ?? null,
            },
            create: {
              videoId,
              locale: t.locale,
              title: t.title ?? null,
              description: t.description ?? null,
              tagline: t.tagline ?? null,
              audience: t.audience ?? null,
            },
          });
        }
      }

      // Update channels (by slug)
      if (data.channels !== undefined) {
        await tx.videoChannel.deleteMany({ where: { videoId } });

        for (const slug of data.channels) {
          const channel = await tx.channel.findUnique({
            where: { slug },
          });

          if (channel) {
            await tx.videoChannel.create({
              data: {
                videoId,
                channelId: channel.id,
              },
            });
          }
        }
      }

      // Update tags (by slug)
      if (data.tags !== undefined) {
        await tx.videoTag.deleteMany({ where: { videoId } });

        for (const slug of data.tags) {
          const tag = await tx.tag.findUnique({
            where: { slug },
          });

          if (tag) {
            await tx.videoTag.create({
              data: {
                videoId,
                tagId: tag.id,
              },
            });
          }
        }
      }
    });

    // Return updated video
    return this.prisma.video.findUnique({
      where: { id: videoId },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
    });
  }

  async submitForModeration(videoId: string, externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: { id: videoId, uploaderId: user.id },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Only allow submission from READY status
    if (video.status !== 'READY') {
      throw new BadRequestException(
        'Video must be READY to submit for moderation',
      );
    }

    await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'PENDING_APPROVAL',
      },
    });

    return { success: true, videoId, status: 'PENDING_APPROVAL' };
  }

  async resubmitVideo(videoId: string, externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: { id: videoId, uploaderId: user.id },
      select: {
        id: true,
        uploaderId: true,
        status: true,
        moderationVersion: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.uploaderId !== user.id) {
      throw new ForbiddenException('You cannot resubmit this video');
    }

    if (video.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected videos can be resubmitted');
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'PENDING_APPROVAL',
        resubmittedAt: new Date(),
        moderationVersion: {
          increment: 1,
        },
      },
      select: {
        id: true,
        status: true,
        resubmittedAt: true,
        moderationVersion: true,
      },
    });

    return {
      id: updated.id,
      status: updated.status,
      resubmittedAt: updated.resubmittedAt?.toISOString() ?? null,
      moderationVersion: updated.moderationVersion,
      message: 'Video resubmitted for moderation',
    };
  }

  async getUserByExternalId(externalId: string) {
    return this.prisma.user.findUnique({
      where: { externalId },
    });
  }

  async queryMine(
    userId: string,
    opts: {
      locale: string;
      q?: string;
      status?: string;
      visibility?: string;
      page?: number;
      pageSize?: number;
    },
  ) {
    return this.queryService.listMine(userId, opts);
  }
}
