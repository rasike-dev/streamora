import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class PublicVideoBySlugController {
  constructor(private prisma: PrismaService) {}

  @Get('videos/by-slug/:slug')
  async get(
    @Param('slug') slug: string,
    @Query('locale') locale: string = 'en',
  ) {
    const v = await this.prisma.video.findUnique({
      where: { slug },
      include: {
        translations: true,
        uploader: true,
        tags: { include: { tag: true } },
        channels: { include: { channel: true } },
      },
    });

    if (!v) throw new NotFoundException('Video not found');

    // Allow PUBLIC and UNLISTED for direct access, but not PRIVATE
    if (
      v.status !== 'PUBLISHED' ||
      (v.visibility !== 'PUBLIC' && v.visibility !== 'UNLISTED')
    ) {
      throw new NotFoundException('Video not found');
    }

    const t =
      v.translations.find((x) => x.locale === locale) ??
      v.translations.find((x) => x.locale === 'en') ??
      null;

    // Uploader privacy: show only if uploaderVisible AND creator approved
    let uploader: string | null = null;
    if (v.uploaderVisible && v.uploaderId) {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { userId: v.uploaderId },
      });
      if (profile?.approval === 'APPROVED') {
        uploader = v.uploader?.displayName || v.uploader?.username || null;
      }
    }

    return {
      id: v.id,
      slug: v.slug,
      title: t?.title ?? null,
      description: t?.description ?? null,
      tagline: t?.tagline ?? null,
      uploader,
      channels: v.channels.map((c) => ({
        slug: c.channel.slug,
        name: c.channel.name,
      })),
      tags: v.tags.map((x) => ({ slug: x.tag.slug, name: x.tag.name })),
      createdAt: v.createdAt,
    };
  }
}
