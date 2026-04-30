import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PublicChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async getChannelBySlug(
    slug: string,
    opts: { locale: string; page: number; pageSize: number },
  ) {
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(48, Math.max(1, opts.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const channel = await this.prisma.channel.findFirst({
      where: {
        slug,
        isActive: true,
      },
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

    if (!channel) {
      throw new NotFoundException('Channel not found');
    }

    const translated =
      channel.translations.find((t) => t.locale === opts.locale) ??
      channel.translations.find((t) => t.locale === 'en');

    const where = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
      channels: {
        some: {
          channelId: channel.id,
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
        },
      }),
    ]);

    return {
      channel: {
        id: channel.id,
        slug: channel.slug,
        name: translated?.name ?? channel.name,
        description: translated?.description ?? null,
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

        return {
          id: video.id,
          slug: video.slug,
          title: translation?.title ?? 'Untitled',
          description: translation?.description ?? null,
          tagline: translation?.tagline ?? null,
          thumbnailUrl: selectedThumb
            ? this.toPublicUrl(selectedThumb.bucket, selectedThumb.objectKey)
            : null,
          uploaderName: video.uploaderVisible
            ? (video.uploader?.displayName ?? video.uploader?.username ?? null)
            : null,
          publishedAt: video.publishedAt,
        };
      }),
    };
  }
}
