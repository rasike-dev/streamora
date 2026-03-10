import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class PublicVideoShareController {
  constructor(private prisma: PrismaService) {}

  @Get('public/videos/:slug')
  async getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: string = 'en'
  ) {
    const v = await this.prisma.video.findUnique({
      where: { slug },
      include: {
        translations: true,
        uploader: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!v) throw new NotFoundException('Video not found');
    if (v.status !== 'PUBLISHED' || (v.visibility !== 'PUBLIC' && v.visibility !== 'UNLISTED')) {
      throw new NotFoundException('Video not found');
    }

    const asset = await this.prisma.videoAsset.findUnique({
      where: { videoId: v.id },
    });

    const thumb = await this.prisma.videoThumbnail.findFirst({
      where: { videoId: v.id, isSelected: true },
    });

    const t =
      v.translations.find((x) => x.locale === locale) ??
      v.translations.find((x) => x.locale === 'en') ??
      v.translations[0] ??
      null;

    let uploader: string | null = null;
    if (v.uploaderVisible && v.uploaderId) {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { userId: v.uploaderId },
      });

      if (profile?.approval === 'APPROVED') {
        uploader = v.uploader?.displayName || v.uploader?.username || null;
      }
    }

    const masterUrl =
      asset?.hlsBucket && asset?.hlsMasterKey
        ? `https://storage.googleapis.com/${asset.hlsBucket}/${asset.hlsMasterKey}`
        : null;

    const thumbUrl =
      thumb
        ? `https://storage.googleapis.com/${thumb.bucket}/${thumb.objectKey}`
        : null;

    return {
      id: v.id,
      slug: v.slug,
      title: t?.title ?? null,
      description: t?.description ?? null,
      tagline: t?.tagline ?? null,
      audience: t?.audience ?? null,
      uploader,
      createdAt: v.createdAt,
      playbackUrl: masterUrl,
      thumbnailUrl: thumbUrl,
      channels: v.channels.map((c) => ({
        slug: c.channel.slug,
        name: c.channel.name,
      })),
      tags: v.tags.map((x) => ({
        slug: x.tag.slug,
        name: x.tag.name,
      })),
    };
  }
}
