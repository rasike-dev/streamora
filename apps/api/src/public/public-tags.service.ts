import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeTagName } from '../common/taxonomy/normalize.util';

@Injectable()
export class PublicTagsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves a URL slug to the tag that should be shown.
   *
   * A merged tag keeps its row and slug, so old links stay resolvable and are
   * answered with the merge target plus a canonical slug the page can redirect
   * to. Aliases added by admins are matched on their normalized form.
   */
  private async resolveTag(slug: string) {
    const direct = await this.prisma.tag.findFirst({ where: { slug } });

    if (direct) {
      if (direct.status === 'MERGED' && direct.mergedIntoTagId) {
        const target = await this.prisma.tag.findUnique({
          where: { id: direct.mergedIntoTagId },
        });
        if (target) return target;
      }

      return direct;
    }

    const alias = await this.prisma.tagAlias.findUnique({
      where: { normalizedAlias: normalizeTagName(slug.replace(/-/g, ' ')) },
      include: { tag: true },
    });

    return alias?.tag ?? null;
  }

  private toPublicUrl(bucket: string, objectKey: string) {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async getTagBySlug(
    slug: string,
    opts: { locale: string; page: number; pageSize: number },
  ) {
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(48, Math.max(1, opts.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const resolved = await this.resolveTag(slug);

    if (!resolved) {
      throw new NotFoundException('Tag not found');
    }

    const tag = await this.prisma.tag.findUniqueOrThrow({
      where: { id: resolved.id },
      include: {
        translations: {
          where: {
            locale: {
              in: [opts.locale, 'en'],
            },
          },
        },
      },
    });

    const translated =
      tag.translations.find((t) => t.locale === opts.locale) ??
      tag.translations.find((t) => t.locale === 'en');

    const where = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      OR: [
        { sourceType: 'UPLOAD' as const },
        { externalEmbed: { validationStatus: 'ACTIVE' as const } },
      ],
      tags: {
        some: {
          tagId: tag.id,
        },
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          translations: {
            where: {
              locale: {
                in: [opts.locale, 'en'],
              },
            },
          },
          thumbnails: {
            where: { isSelected: true },
            take: 1,
          },
          uploader: true,
          channels: {
            take: 1,
            include: {
              channel: {
                include: {
                  translations: {
                    where: {
                      locale: {
                        in: [opts.locale, 'en'],
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return {
      tag: {
        id: tag.id,
        slug: tag.slug,
        name: translated?.name ?? tag.name,
        description: translated?.description ?? null,
        // Non-null when the requested slug was an alias or a merged tag.
        redirectedFrom: tag.slug === slug ? null : slug,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items: items.map((video) => {
        const translation =
          video.translations.find((t) => t.locale === opts.locale) ??
          video.translations.find((t) => t.locale === 'en');

        const selectedThumb = video.thumbnails[0];
        const primaryChannel = video.channels[0]?.channel;
        const channelTranslation =
          primaryChannel?.translations.find((t) => t.locale === opts.locale) ??
          primaryChannel?.translations.find((t) => t.locale === 'en');

        return {
          id: video.id,
          slug: video.slug,
          title: translation?.title ?? 'Untitled',
          description: translation?.description ?? null,
          tagline: translation?.tagline ?? null,
          thumbnailUrl: selectedThumb
            ? this.toPublicUrl(selectedThumb.bucket, selectedThumb.objectKey)
            : null,
          publishedAt: video.publishedAt,
          channel: primaryChannel
            ? {
                slug: primaryChannel.slug,
                name: channelTranslation?.name ?? primaryChannel.name,
              }
            : null,
          uploader: video.uploaderVisible
            ? video.uploader?.displayName
              ? {
                  displayName: video.uploader.displayName,
                }
              : null
            : null,
        };
      }),
    };
  }
}
