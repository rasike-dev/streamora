import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';
import { PublicVideosService } from './public-videos.service';

@Controller()
export class PublicVideoShareController {
  constructor(
    private prisma: PrismaService,
    private publicVideosService: PublicVideosService,
    private taxonomy: TaxonomyService,
  ) {}

  @Get('public/videos/:slug')
  async getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale: string = 'en',
  ) {
    const v = await this.prisma.video.findUnique({
      where: { slug },
      include: {
        translations: true,
        uploader: true,
        channels: {
          include: {
            channel: {
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
        subtitles: true,
      },
    });

    if (!v) throw new NotFoundException('Video not found');
    if (
      v.status !== 'PUBLISHED' ||
      (v.visibility !== 'PUBLIC' && v.visibility !== 'UNLISTED')
    ) {
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

    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    const masterUrl =
      asset?.hlsBucket && asset?.hlsMasterKey
        ? cdnBase
          ? `${cdnBase}/${asset.hlsMasterKey}`
          : `https://storage.googleapis.com/${asset.hlsBucket}/${asset.hlsMasterKey}`
        : null;

    const thumbUrl = thumb
      ? cdnBase
        ? `${cdnBase}/${thumb.objectKey}`
        : `https://storage.googleapis.com/${thumb.bucket}/${thumb.objectKey}`
      : null;

    // Breadcrumb comes from the primary channel; videos that predate the
    // taxonomy simply have no trail rather than a guessed one.
    const breadcrumb = v.primaryChannelId
      ? await this.taxonomy.getChannelBreadcrumb(v.primaryChannelId, locale)
      : null;

    const subtitles = v.subtitles.map((sub) => ({
      locale: sub.locale,
      url: cdnBase
        ? `${cdnBase}/${sub.objectKey}`
        : `https://storage.googleapis.com/${sub.bucket}/${sub.objectKey}`,
    }));

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
      breadcrumb,
      channels: v.channels.map((c) => ({
        slug: c.channel.slug,
        name: this.taxonomy.localize(
          c.channel.translations,
          locale,
          c.channel.name,
        ),
      })),
      tags: v.tags.map((x) => ({
        slug: x.tag.slug,
        name: this.taxonomy.localize(x.tag.translations, locale, x.tag.name),
      })),
      subtitles,
    };
  }

  @Get('public/videos/:slug/embed')
  async getEmbedVideo(
    @Param('slug') slug: string,
    @Query('locale') locale: string = 'en',
  ) {
    return this.publicVideosService.getPublicEmbedVideoBySlug(slug, locale);
  }
}
