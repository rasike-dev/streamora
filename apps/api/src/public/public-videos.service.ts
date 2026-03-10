import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicVideosService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const base = process.env.PUBLIC_ASSET_BASE_URL;
    if (base) return `${base}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async listVideos(opts: {
    locale: string;
    q?: string;
    channel?: string;
    tag?: string;
    page?: number;
    pageSize?: number;
  }) {
    const locale = opts.locale || 'en';
    const q = opts.q?.trim();
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(48, Math.max(1, opts.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const where: any = {
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    };

    if (q) {
      where.translations = {
        some: {
          locale: { in: [locale, 'en'] },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { tagline: { contains: q, mode: 'insensitive' } },
          ],
        },
      };
    }

    if (opts.channel) {
      where.channels = {
        some: {
          channel: {
            slug: opts.channel,
            isActive: true,
          },
        },
      };
    }

    if (opts.tag) {
      where.tags = {
        some: {
          tag: {
            slug: opts.tag,
          },
        },
      };
    }

    const [total, items] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [
          { publishedAt: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          translations: {
            where: {
              locale: {
                in: [locale, 'en'],
              },
            },
          },
          thumbnails: {
            where: { isSelected: true },
            take: 1,
          },
          channels: {
            include: {
              channel: {
                include: {
                  translations: {
                    where: {
                      locale: {
                        in: [locale, 'en'],
                      },
                    },
                  },
                },
              },
            },
          },
          tags: {
            include: {
              tag: {
                include: {
                  translations: {
                    where: {
                      locale: {
                        in: [locale, 'en'],
                      },
                    },
                  },
                },
              },
            },
          },
          uploader: true,
        },
      }),
    ]);

    // Fetch creator profiles for uploader privacy check
    const uploaderIds = items.filter(v => v.uploaderId && v.uploaderVisible).map(v => v.uploaderId!);
    const profiles = uploaderIds.length > 0
      ? await this.prisma.creatorProfile.findMany({
          where: { userId: { in: uploaderIds } },
        })
      : [];
    const approvedCreatorIds = new Set(
      profiles.filter(p => p.approval === 'APPROVED').map(p => p.userId)
    );

    return {
      filters: {
        q: q ?? '',
        channel: opts.channel ?? null,
        tag: opts.tag ?? null,
        locale,
      },
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items: items.map((video) => {
        const translation =
          video.translations.find((t) => t.locale === locale) ??
          video.translations.find((t) => t.locale === 'en');

        const selectedThumb = video.thumbnails[0];

        // uploader identity hidden unless uploaderVisible is true AND creator approved
        let uploaderName: string | null = null;
        if (video.uploaderVisible && video.uploaderId && approvedCreatorIds.has(video.uploaderId)) {
          uploaderName = video.uploader?.displayName ?? video.uploader?.username ?? null;
        }

        return {
          id: video.id,
          slug: video.slug,
          title: translation?.title ?? 'Untitled',
          description: translation?.description ?? null,
          tagline: translation?.tagline ?? null,
          thumbnailUrl: selectedThumb
            ? this.toPublicUrl(selectedThumb.bucket, selectedThumb.objectKey)
            : null,
          uploaderName,
          publishedAt: video.publishedAt,
          channels: video.channels.map((vc) => {
            const tr =
              vc.channel.translations.find((t) => t.locale === locale) ??
              vc.channel.translations.find((t) => t.locale === 'en');

            return {
              slug: vc.channel.slug,
              name: tr?.name ?? vc.channel.name,
            };
          }),
          tags: video.tags.map((vt) => {
            const tr =
              vt.tag.translations.find((t) => t.locale === locale) ??
              vt.tag.translations.find((t) => t.locale === 'en');

            return {
              slug: vt.tag.slug,
              name: tr?.name ?? vt.tag.name,
            };
          }),
        };
      }),
    };
  }
}
