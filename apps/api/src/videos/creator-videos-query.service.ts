import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreatorVideosQueryService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const base = process.env.PUBLIC_ASSET_BASE_URL;
    if (base) return `${base}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async listMine(userId: string, opts: {
    locale: string;
    q?: string;
    status?: string;
    visibility?: string;
    page?: number;
    pageSize?: number;
  }) {
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
