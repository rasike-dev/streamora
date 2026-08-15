import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Translation = {
  locale: string;
  name: string;
  description?: string | null;
};

export type Breadcrumb = {
  category: { slug: string; name: string } | null;
  subcategory: { slug: string; name: string } | null;
  channel: { slug: string; name: string };
};

/**
 * Read-side taxonomy access shared by the public controllers and the admin UI.
 *
 * Locale fallback follows the convention already used by ChannelsService.findAll:
 * requested locale, then 'en', then the base column on the row itself.
 */
@Injectable()
export class TaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  localize(
    translations: Translation[] | undefined,
    locale: string,
    baseName: string,
  ): string {
    if (!translations?.length) return baseName;

    const exact = translations.find((t) => t.locale === locale);
    const fallback = translations.find((t) => t.locale === 'en');

    return exact?.name || fallback?.name || baseName;
  }

  private localizeDescription(
    translations: Translation[] | undefined,
    locale: string,
    baseDescription: string | null,
  ): string | null {
    if (!translations?.length) return baseDescription;

    const exact = translations.find((t) => t.locale === locale);
    const fallback = translations.find((t) => t.locale === 'en');

    return exact?.description || fallback?.description || baseDescription;
  }

  /** Active categories with their active subcategories and mapped active channels. */
  async getPublicTree(locale: string) {
    const categories = await this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        translations: { where: { locale: { in: [locale, 'en'] } } },
        subcategories: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          include: {
            translations: { where: { locale: { in: [locale, 'en'] } } },
            channels: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: this.localize(category.translations, locale, category.name),
      description: this.localizeDescription(
        category.translations,
        locale,
        category.description,
      ),
      displayOrder: category.displayOrder,
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: this.localize(subcategory.translations, locale, subcategory.name),
        description: this.localizeDescription(
          subcategory.translations,
          locale,
          subcategory.description,
        ),
        displayOrder: subcategory.displayOrder,
        channels: subcategory.channels.map((channel) => ({
          id: channel.id,
          slug: channel.slug,
          name: this.localize(channel.translations, locale, channel.name),
        })),
      })),
    }));
  }

  async getCategoryBySlug(slug: string, locale: string) {
    const category = await this.prisma.category.findFirst({
      where: { slug, isActive: true },
      include: {
        translations: { where: { locale: { in: [locale, 'en'] } } },
        subcategories: {
          where: { isActive: true },
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          include: {
            translations: { where: { locale: { in: [locale, 'en'] } } },
            channels: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
      },
    });

    if (!category) throw new NotFoundException('Category not found');

    const channelIds = category.subcategories.flatMap((s) =>
      s.channels.map((c) => c.id),
    );
    const counts = await this.countPublishedVideosByChannel(channelIds);

    return {
      id: category.id,
      slug: category.slug,
      name: this.localize(category.translations, locale, category.name),
      description: this.localizeDescription(
        category.translations,
        locale,
        category.description,
      ),
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: this.localize(subcategory.translations, locale, subcategory.name),
        description: this.localizeDescription(
          subcategory.translations,
          locale,
          subcategory.description,
        ),
        videoCount: subcategory.channels.reduce(
          (sum, channel) => sum + (counts.get(channel.id) ?? 0),
          0,
        ),
        channels: subcategory.channels.map((channel) => ({
          id: channel.id,
          slug: channel.slug,
          name: this.localize(channel.translations, locale, channel.name),
          videoCount: counts.get(channel.id) ?? 0,
        })),
      })),
    };
  }

  /**
   * Subcategory slugs are only unique within their category, so lookup is always
   * scoped by the parent category slug.
   */
  async getSubcategoryBySlug(
    categorySlug: string,
    subcategorySlug: string,
    locale: string,
  ) {
    const subcategory = await this.prisma.subcategory.findFirst({
      where: {
        slug: subcategorySlug,
        isActive: true,
        category: { slug: categorySlug, isActive: true },
      },
      include: {
        translations: { where: { locale: { in: [locale, 'en'] } } },
        category: {
          include: {
            translations: { where: { locale: { in: [locale, 'en'] } } },
          },
        },
        channels: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
          include: {
            translations: { where: { locale: { in: [locale, 'en'] } } },
          },
        },
      },
    });

    if (!subcategory) throw new NotFoundException('Subcategory not found');

    const counts = await this.countPublishedVideosByChannel(
      subcategory.channels.map((c) => c.id),
    );

    return {
      id: subcategory.id,
      slug: subcategory.slug,
      name: this.localize(subcategory.translations, locale, subcategory.name),
      description: this.localizeDescription(
        subcategory.translations,
        locale,
        subcategory.description,
      ),
      category: {
        slug: subcategory.category.slug,
        name: this.localize(
          subcategory.category.translations,
          locale,
          subcategory.category.name,
        ),
      },
      channels: subcategory.channels.map((channel) => ({
        id: channel.id,
        slug: channel.slug,
        name: this.localize(channel.translations, locale, channel.name),
        videoCount: counts.get(channel.id) ?? 0,
      })),
    };
  }

  /**
   * Category > Subcategory > Channel trail for a channel.
   * Unmapped channels return null ancestors rather than throwing, so pages for
   * legacy channels keep rendering while admins finish the mapping work.
   */
  async getChannelBreadcrumb(
    channelId: string,
    locale: string,
  ): Promise<Breadcrumb | null> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      include: {
        translations: { where: { locale: { in: [locale, 'en'] } } },
        subcategory: {
          include: {
            translations: { where: { locale: { in: [locale, 'en'] } } },
            category: {
              include: {
                translations: { where: { locale: { in: [locale, 'en'] } } },
              },
            },
          },
        },
      },
    });

    if (!channel) return null;

    return {
      category: channel.subcategory
        ? {
            slug: channel.subcategory.category.slug,
            name: this.localize(
              channel.subcategory.category.translations,
              locale,
              channel.subcategory.category.name,
            ),
          }
        : null,
      subcategory: channel.subcategory
        ? {
            slug: channel.subcategory.slug,
            name: this.localize(
              channel.subcategory.translations,
              locale,
              channel.subcategory.name,
            ),
          }
        : null,
      channel: {
        slug: channel.slug,
        name: this.localize(channel.translations, locale, channel.name),
      },
    };
  }

  private async countPublishedVideosByChannel(channelIds: string[]) {
    const counts = new Map<string, number>();
    if (!channelIds.length) return counts;

    const grouped = await this.prisma.videoChannel.groupBy({
      by: ['channelId'],
      where: {
        channelId: { in: channelIds },
        video: { status: 'PUBLISHED', visibility: 'PUBLIC' },
      },
      _count: { videoId: true },
    });

    for (const row of grouped) {
      counts.set(row.channelId, row._count.videoId);
    }

    return counts;
  }
}
