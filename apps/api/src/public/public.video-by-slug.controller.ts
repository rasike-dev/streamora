import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';

@Controller()
export class PublicVideoBySlugController {
  constructor(
    private prisma: PrismaService,
    private taxonomy: TaxonomyService,
  ) {}

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
        tags: {
          include: {
            tag: {
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
        channels: {
          include: {
            channel: {
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
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

    // Breadcrumb comes from the primary channel; videos that predate the
    // taxonomy simply have no trail rather than a guessed one.
    const breadcrumb = v.primaryChannelId
      ? await this.taxonomy.getChannelBreadcrumb(v.primaryChannelId, locale)
      : null;

    return {
      id: v.id,
      slug: v.slug,
      title: t?.title ?? null,
      description: t?.description ?? null,
      tagline: t?.tagline ?? null,
      uploader,
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
      createdAt: v.createdAt,
    };
  }
}
