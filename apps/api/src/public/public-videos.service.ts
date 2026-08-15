import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class PublicVideosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) {
      return `${cdnBase}/${objectKey}`;
    }
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async listVideos(opts: {
    locale: string;
    q?: string;
    category?: string;
    subcategory?: string;
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

    // Use ranked search if query exists and is at least 2 characters
    if (q && q.length >= 2) {
      const searchResult = await this.searchService.searchPublicVideos({
        locale,
        q,
        category: opts.category,
        subcategory: opts.subcategory,
        channel: opts.channel,
        tag: opts.tag,
        page,
        pageSize,
      });

      if (searchResult) {
        // Hydrate with full data including channels/tags
        const videoIds = searchResult.items.map((item) => item.id);
        const videos = await this.prisma.video.findMany({
          where: { id: { in: videoIds } },
          include: {
            translations: {
              where: { locale: { in: [locale, 'en'] } },
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
                      where: { locale: { in: [locale, 'en'] } },
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
                      where: { locale: { in: [locale, 'en'] } },
                    },
                  },
                },
              },
            },
            uploader: true,
          },
        });

        // Preserve search order
        const orderedVideos = videoIds
          .map((id) => videos.find((v) => v.id === id))
          .filter((v): v is NonNullable<typeof v> => v !== undefined);

        // Fetch creator profiles for uploader privacy check
        const uploaderIds = orderedVideos
          .filter((v) => v.uploaderId && v.uploaderVisible)
          .map((v) => v.uploaderId!);
        const profiles =
          uploaderIds.length > 0
            ? await this.prisma.creatorProfile.findMany({
                where: { userId: { in: uploaderIds } },
              })
            : [];
        const approvedCreatorIds = new Set(
          profiles
            .filter((p) => p.approval === 'APPROVED')
            .map((p) => p.userId),
        );

        return {
          filters: {
            q: q ?? '',
            category: opts.category ?? null,
            subcategory: opts.subcategory ?? null,
            channel: opts.channel ?? null,
            tag: opts.tag ?? null,
            locale,
          },
          pagination: searchResult.pagination,
          searchMeta: searchResult.searchMeta,
          items: orderedVideos.map((video) => {
            const translation =
              video.translations.find((t) => t.locale === locale) ??
              video.translations.find((t) => t.locale === 'en');

            const selectedThumb = video.thumbnails[0];

            let uploaderName: string | null = null;
            if (
              video.uploaderVisible &&
              video.uploaderId &&
              approvedCreatorIds.has(video.uploaderId)
            ) {
              uploaderName =
                video.uploader?.displayName ?? video.uploader?.username ?? null;
            }

            return {
              id: video.id,
              slug: video.slug,
              title: translation?.title ?? 'Untitled',
              description: translation?.description ?? null,
              tagline: translation?.tagline ?? null,
              thumbnailUrl: selectedThumb
                ? this.toPublicUrl(
                    selectedThumb.bucket,
                    selectedThumb.objectKey,
                  )
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

    // Fallback to normal listing
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

    // Channel, subcategory and category all constrain the same relation, so they
    // are merged into one `some` clause: a single channel must satisfy all of
    // them rather than one channel matching each filter independently.
    const channelWhere: any = {};

    if (opts.channel) {
      channelWhere.slug = opts.channel;
    }

    if (opts.subcategory) {
      channelWhere.subcategory = {
        slug: opts.subcategory,
        isActive: true,
        ...(opts.category
          ? { category: { slug: opts.category, isActive: true } }
          : {}),
      };
    } else if (opts.category) {
      channelWhere.subcategory = {
        isActive: true,
        category: { slug: opts.category, isActive: true },
      };
    }

    if (Object.keys(channelWhere).length) {
      where.channels = {
        some: { channel: { ...channelWhere, isActive: true } },
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
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
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
    const uploaderIds = items
      .filter((v) => v.uploaderId && v.uploaderVisible)
      .map((v) => v.uploaderId!);
    const profiles =
      uploaderIds.length > 0
        ? await this.prisma.creatorProfile.findMany({
            where: { userId: { in: uploaderIds } },
          })
        : [];
    const approvedCreatorIds = new Set(
      profiles.filter((p) => p.approval === 'APPROVED').map((p) => p.userId),
    );

    return {
      filters: {
        q: q ?? '',
        category: opts.category ?? null,
        subcategory: opts.subcategory ?? null,
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
      searchMeta: {
        query: q ?? '',
        mode: 'listing' as const,
      },
      items: items.map((video) => {
        const translation =
          video.translations.find((t) => t.locale === locale) ??
          video.translations.find((t) => t.locale === 'en');

        const selectedThumb = video.thumbnails[0];

        // uploader identity hidden unless uploaderVisible is true AND creator approved
        let uploaderName: string | null = null;
        if (
          video.uploaderVisible &&
          video.uploaderId &&
          approvedCreatorIds.has(video.uploaderId)
        ) {
          uploaderName =
            video.uploader?.displayName ?? video.uploader?.username ?? null;
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

  async getPublicEmbedVideoBySlug(slug: string, locale: string) {
    const video = await this.prisma.video.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        status: true,
        visibility: true,
        uploaderVisible: true,
        uploaderId: true,
        uploader: {
          select: {
            displayName: true,
          },
        },
        translations: {
          where: {
            locale: { in: [locale, 'en'] },
          },
          select: {
            locale: true,
            title: true,
            description: true,
            tagline: true,
          },
        },
        asset: {
          select: {
            hlsBucket: true,
            hlsMasterKey: true,
            durationSec: true,
          },
        },
        thumbnails: {
          where: {
            isSelected: true,
          },
          select: {
            bucket: true,
            objectKey: true,
          },
          take: 1,
        },
        subtitles: {
          select: {
            locale: true,
            format: true,
            bucket: true,
            objectKey: true,
          },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    // Embed rule: Only PUBLISHED + PUBLIC (not UNLISTED)
    const isEmbeddable =
      video.status === 'PUBLISHED' && video.visibility === 'PUBLIC';

    if (!isEmbeddable) {
      throw new NotFoundException('Video not found');
    }

    const translation = this.pickTranslation(video.translations, locale);
    const asset = video.asset;

    if (!asset?.hlsBucket || !asset?.hlsMasterKey) {
      throw new NotFoundException('Video asset not found');
    }

    // Check uploader visibility and creator approval
    let uploader: { displayName: string } | null = null;
    if (video.uploaderVisible && video.uploaderId) {
      const profile = await this.prisma.creatorProfile.findUnique({
        where: { userId: video.uploaderId },
      });
      if (profile?.approval === 'APPROVED' && video.uploader?.displayName) {
        uploader = { displayName: video.uploader.displayName };
      }
    }

    return {
      id: video.id,
      slug: video.slug,
      title: translation.title,
      description: translation.description,
      tagline: translation.tagline,
      hlsUrl: this.toPublicUrl(asset.hlsBucket, asset.hlsMasterKey),
      thumbnailUrl: video.thumbnails[0]
        ? this.toPublicUrl(
            video.thumbnails[0].bucket,
            video.thumbnails[0].objectKey,
          )
        : null,
      durationSeconds: asset.durationSec ? Math.round(asset.durationSec) : null,
      uploader,
      canonicalUrl: `/${locale}/v/${video.slug}`,
      embedUrl: `/${locale}/embed/${video.slug}`,
      subtitles: video.subtitles.map((sub) => ({
        locale: sub.locale,
        url: this.toPublicUrl(sub.bucket, sub.objectKey),
      })),
    };
  }

  private pickTranslation(
    translations: Array<{
      locale: string;
      title: string | null;
      description: string | null;
      tagline: string | null;
    }>,
    locale: string,
  ) {
    const exact = translations.find((t) => t.locale === locale);
    const fallback = translations.find((t) => t.locale === 'en');

    return {
      title: exact?.title || fallback?.title || 'Untitled',
      description: exact?.description || fallback?.description || null,
      tagline: exact?.tagline || fallback?.tagline || null,
    };
  }
}
