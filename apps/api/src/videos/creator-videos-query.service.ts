import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SearchService } from '../search/search.service';

@Injectable()
export class CreatorVideosQueryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly searchService: SearchService,
  ) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async listMine(
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
    const locale = opts.locale || 'en';
    const q = opts.q?.trim();
    const page = Math.max(1, opts.page || 1);
    const pageSize = Math.min(48, Math.max(1, opts.pageSize || 12));
    const skip = (page - 1) * pageSize;

    const where: any = {
      uploaderId: userId,
    };

    if (opts.status) {
      where.status = opts.status;
    }

    if (opts.visibility) {
      where.visibility = opts.visibility;
    }

    // Use ranked search if query exists and is at least 2 characters
    if (q && q.length >= 2) {
      const searchResult = await this.searchService.searchCreatorVideos({
        userId,
        locale,
        q,
        status: opts.status,
        visibility: opts.visibility,
        page,
        pageSize,
      });

      if (searchResult) {
        return {
          filters: {
            q: q ?? '',
            status: opts.status ?? null,
            visibility: opts.visibility ?? null,
          },
          pagination: searchResult.pagination,
          searchMeta: searchResult.searchMeta,
          items: searchResult.items,
        };
      }
    }

    // Fallback to normal listing
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

    const [total, items] = await Promise.all([
      this.prisma.video.count({ where }),
      this.prisma.video.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ updatedAt: 'desc' }],
        include: {
          translations: {
            where: {
              locale: { in: [locale, 'en'] },
            },
          },
          thumbnails: {
            where: { isSelected: true },
            take: 1,
          },
        },
      }),
    ]);

    return {
      filters: {
        q: q ?? '',
        status: opts.status ?? null,
        visibility: opts.visibility ?? null,
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

        const thumb = video.thumbnails[0];

        return {
          id: video.id,
          slug: video.slug,
          status: video.status,
          visibility: video.visibility,
          title: translation?.title ?? 'Untitled',
          tagline: translation?.tagline ?? null,
          thumbnailUrl: thumb
            ? this.toPublicUrl(thumb.bucket, thumb.objectKey)
            : null,
          scheduledAt: video.scheduledAt,
          publishedAt: video.publishedAt,
          updatedAt: video.updatedAt,
        };
      }),
    };
  }
}
