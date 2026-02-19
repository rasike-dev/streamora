import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VideosService {
  constructor(private prisma: PrismaService) {}

  async createDraft(keycloakSub: string, data: {
    locale: string;
    title?: string;
    description?: string;
    tagline?: string;
    channelIds?: string[];
    tagIds?: string[];
  }) {
    // Find user by keycloakSub
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
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

  async updateDraft(videoId: string, keycloakSub: string, data: {
    locale?: string;
    title?: string;
    description?: string;
    tagline?: string;
    channelIds?: string[];
    tagIds?: string[];
  }) {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
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

  async findByUploader(keycloakSub: string) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
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
}
