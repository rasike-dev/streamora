import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  TaxonomyAuditAction,
  TaxonomyEntityType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { resolveUniqueSlug, slugify } from '../common/taxonomy/normalize.util';
import { TaxonomyService } from './taxonomy.service';
import {
  CreateCategoryDto,
  CreateSubcategoryDto,
  TaxonomyTranslationDto,
  UpdateCategoryDto,
  UpdateSubcategoryDto,
} from './dto/taxonomy.dto';

export type ImpactReport = {
  entityType: TaxonomyEntityType;
  entityId: string;
  name: string;
  subcategories: number;
  channels: number;
  videos: number;
  mediaItems: number;
  blockers: string[];
};

@Injectable()
export class AdminTaxonomyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly taxonomy: TaxonomyService,
  ) {}

  // ---------------------------------------------------------------- audit

  private async audit(
    entityType: TaxonomyEntityType,
    entityId: string,
    action: TaxonomyAuditAction,
    actorUserId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.taxonomyAuditLog.create({
      data: { entityType, entityId, action, actorUserId, metadata },
    });
  }

  async getAuditLog(params: {
    entityType?: TaxonomyEntityType;
    entityId?: string;
    limit?: number;
  }) {
    return this.prisma.taxonomyAuditLog.findMany({
      where: {
        entityType: params.entityType,
        entityId: params.entityId,
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(200, Math.max(1, params.limit ?? 50)),
    });
  }

  // ------------------------------------------------------------------ read

  /** Full tree including archived rows, with dependent counts for the admin UI. */
  async getAdminTree(locale = 'en') {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        translations: true,
        subcategories: {
          orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
          include: {
            translations: true,
            channels: {
              orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
              include: {
                translations: true,
                _count: { select: { videos: true, mediaItems: true } },
              },
            },
          },
        },
      },
    });

    return categories.map((category) => ({
      id: category.id,
      slug: category.slug,
      name: category.name,
      localizedName: this.taxonomy.localize(
        category.translations,
        locale,
        category.name,
      ),
      description: category.description,
      displayOrder: category.displayOrder,
      isActive: category.isActive,
      translations: category.translations.map((t) => ({
        locale: t.locale,
        name: t.name,
        description: t.description,
      })),
      subcategories: category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        slug: subcategory.slug,
        name: subcategory.name,
        localizedName: this.taxonomy.localize(
          subcategory.translations,
          locale,
          subcategory.name,
        ),
        description: subcategory.description,
        displayOrder: subcategory.displayOrder,
        isActive: subcategory.isActive,
        translations: subcategory.translations.map((t) => ({
          locale: t.locale,
          name: t.name,
          description: t.description,
        })),
        channels: subcategory.channels.map((channel) => ({
          id: channel.id,
          slug: channel.slug,
          name: channel.name,
          localizedName: this.taxonomy.localize(
            channel.translations,
            locale,
            channel.name,
          ),
          isActive: channel.isActive,
          sortOrder: channel.sortOrder,
          videoCount: channel._count.videos,
          mediaItemCount: channel._count.mediaItems,
        })),
      })),
    }));
  }

  /**
   * Channels that predate the hierarchy or were created without a subcategory.
   * Surfacing them as a bucket is why Channel.subcategoryId stays nullable in the
   * database: a NOT NULL constraint would have broken existing rows on deploy.
   */
  async getUnmappedChannels(locale = 'en') {
    const channels = await this.prisma.channel.findMany({
      where: { subcategoryId: null },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        translations: true,
        _count: { select: { videos: true, mediaItems: true } },
      },
    });

    return channels.map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      localizedName: this.taxonomy.localize(
        channel.translations,
        locale,
        channel.name,
      ),
      isActive: channel.isActive,
      videoCount: channel._count.videos,
      mediaItemCount: channel._count.mediaItems,
    }));
  }

  /**
   * What breaks if this node is archived or moved.
   * The admin UI shows this before asking for confirmation.
   */
  async getImpact(
    entityType: TaxonomyEntityType,
    entityId: string,
  ): Promise<ImpactReport> {
    if (entityType === 'CATEGORY') {
      const category = await this.prisma.category.findUnique({
        where: { id: entityId },
        include: {
          subcategories: {
            include: { channels: { select: { id: true, isActive: true } } },
          },
        },
      });
      if (!category) throw new NotFoundException('Category not found');

      const channelIds = category.subcategories.flatMap((s) =>
        s.channels.map((c) => c.id),
      );
      const [videos, mediaItems] = await this.countContent(channelIds);
      const activeSubcategories = category.subcategories.filter(
        (s) => s.isActive,
      ).length;

      return {
        entityType,
        entityId,
        name: category.name,
        subcategories: category.subcategories.length,
        channels: channelIds.length,
        videos,
        mediaItems,
        blockers: activeSubcategories
          ? [
              `${activeSubcategories} active subcategor${activeSubcategories === 1 ? 'y' : 'ies'} must be archived or moved first`,
            ]
          : [],
      };
    }

    if (entityType === 'SUBCATEGORY') {
      const subcategory = await this.prisma.subcategory.findUnique({
        where: { id: entityId },
        include: { channels: { select: { id: true, isActive: true } } },
      });
      if (!subcategory) throw new NotFoundException('Subcategory not found');

      const channelIds = subcategory.channels.map((c) => c.id);
      const [videos, mediaItems] = await this.countContent(channelIds);
      const activeChannels = subcategory.channels.filter(
        (c) => c.isActive,
      ).length;

      return {
        entityType,
        entityId,
        name: subcategory.name,
        subcategories: 0,
        channels: channelIds.length,
        videos,
        mediaItems,
        blockers: activeChannels
          ? [
              `${activeChannels} active channel${activeChannels === 1 ? '' : 's'} must be moved or deactivated first`,
            ]
          : [],
      };
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: entityId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const [videos, mediaItems] = await this.countContent([channel.id]);

    return {
      entityType: 'CHANNEL',
      entityId,
      name: channel.name,
      subcategories: 0,
      channels: 1,
      videos,
      mediaItems,
      blockers: [],
    };
  }

  private async countContent(channelIds: string[]): Promise<[number, number]> {
    if (!channelIds.length) return [0, 0];

    return Promise.all([
      this.prisma.videoChannel.count({
        where: { channelId: { in: channelIds } },
      }),
      this.prisma.mediaItemChannel.count({
        where: { channelId: { in: channelIds } },
      }),
    ]);
  }

  // -------------------------------------------------------------- category

  async createCategory(dto: CreateCategoryDto, actorId: string) {
    const slug = await resolveUniqueSlug(
      slugify(dto.slug || dto.name),
      async (candidate) =>
        (await this.prisma.category.count({ where: { slug: candidate } })) > 0,
    );

    const displayOrder = dto.displayOrder ?? (await this.nextCategoryOrder());

    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        displayOrder,
        createdBy: actorId,
        updatedBy: actorId,
        translations: dto.translations?.length
          ? { create: this.translationRows(dto.translations) }
          : undefined,
      },
      include: { translations: true },
    });

    await this.audit('CATEGORY', category.id, 'TAXONOMY_CREATED', actorId, {
      slug: category.slug,
      name: category.name,
    });

    return category;
  }

  async updateCategory(id: string, dto: UpdateCategoryDto, actorId: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Category not found');

    let slug = existing.slug;
    if (dto.slug && slugify(dto.slug) !== existing.slug) {
      slug = slugify(dto.slug);
      const clash = await this.prisma.category.findFirst({
        where: { slug, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException(
          `Category slug "${slug}" is already in use`,
        );
      }
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
    });

    await this.upsertCategoryTranslations(id, dto.translations);
    await this.audit('CATEGORY', id, 'TAXONOMY_UPDATED', actorId, {
      changed: Object.keys(dto),
    });

    return category;
  }

  /**
   * Archive rather than delete. Blocked while active subcategories remain, so a
   * category can never be hidden out from under live content.
   */
  async archiveCategory(id: string, actorId: string) {
    const impact = await this.getImpact('CATEGORY', id);
    if (impact.blockers.length) {
      throw new BadRequestException(impact.blockers.join('; '));
    }

    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive: false, updatedBy: actorId },
    });

    await this.audit('CATEGORY', id, 'TAXONOMY_ARCHIVED', actorId, {
      channels: impact.channels,
      videos: impact.videos,
    });

    return category;
  }

  async restoreCategory(id: string, actorId: string) {
    const category = await this.prisma.category.update({
      where: { id },
      data: { isActive: true, updatedBy: actorId },
    });

    await this.audit('CATEGORY', id, 'TAXONOMY_RESTORED', actorId);

    return category;
  }

  async reorderCategories(ids: string[], actorId: string) {
    const found = await this.prisma.category.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException('Reorder list contains unknown categories');
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.category.update({
          where: { id },
          data: { displayOrder: index + 1, updatedBy: actorId },
        }),
      ),
    );

    await this.audit('CATEGORY', ids[0], 'TAXONOMY_REORDERED', actorId, {
      order: ids,
    });

    return { reordered: ids.length };
  }

  // ----------------------------------------------------------- subcategory

  async createSubcategory(dto: CreateSubcategoryDto, actorId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    const slug = await resolveUniqueSlug(
      slugify(dto.slug || dto.name),
      async (candidate) =>
        (await this.prisma.subcategory.count({
          where: { categoryId: dto.categoryId, slug: candidate },
        })) > 0,
    );

    const displayOrder =
      dto.displayOrder ?? (await this.nextSubcategoryOrder(dto.categoryId));

    const subcategory = await this.prisma.subcategory.create({
      data: {
        categoryId: dto.categoryId,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        displayOrder,
        createdBy: actorId,
        updatedBy: actorId,
        translations: dto.translations?.length
          ? { create: this.translationRows(dto.translations) }
          : undefined,
      },
      include: { translations: true },
    });

    await this.audit(
      'SUBCATEGORY',
      subcategory.id,
      'TAXONOMY_CREATED',
      actorId,
      { slug: subcategory.slug, categoryId: dto.categoryId },
    );

    return subcategory;
  }

  async updateSubcategory(
    id: string,
    dto: UpdateSubcategoryDto,
    actorId: string,
  ) {
    const existing = await this.prisma.subcategory.findUnique({
      where: { id },
    });
    if (!existing) throw new NotFoundException('Subcategory not found');

    let slug = existing.slug;
    if (dto.slug && slugify(dto.slug) !== existing.slug) {
      slug = slugify(dto.slug);
      const clash = await this.prisma.subcategory.findFirst({
        where: { categoryId: existing.categoryId, slug, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException(
          `Subcategory slug "${slug}" is already used in this category`,
        );
      }
    }

    const subcategory = await this.prisma.subcategory.update({
      where: { id },
      data: {
        name: dto.name,
        slug,
        description: dto.description,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
        updatedBy: actorId,
      },
    });

    await this.upsertSubcategoryTranslations(id, dto.translations);
    await this.audit('SUBCATEGORY', id, 'TAXONOMY_UPDATED', actorId, {
      changed: Object.keys(dto),
    });

    return subcategory;
  }

  async archiveSubcategory(id: string, actorId: string) {
    const impact = await this.getImpact('SUBCATEGORY', id);
    if (impact.blockers.length) {
      throw new BadRequestException(impact.blockers.join('; '));
    }

    const subcategory = await this.prisma.subcategory.update({
      where: { id },
      data: { isActive: false, updatedBy: actorId },
    });

    await this.audit('SUBCATEGORY', id, 'TAXONOMY_ARCHIVED', actorId, {
      channels: impact.channels,
      videos: impact.videos,
    });

    return subcategory;
  }

  async restoreSubcategory(id: string, actorId: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');
    if (!subcategory.category.isActive) {
      throw new BadRequestException(
        'Restore the parent category before restoring this subcategory',
      );
    }

    const updated = await this.prisma.subcategory.update({
      where: { id },
      data: { isActive: true, updatedBy: actorId },
    });

    await this.audit('SUBCATEGORY', id, 'TAXONOMY_RESTORED', actorId);

    return updated;
  }

  /** Re-parent a subcategory. Re-classifies every video underneath it, so it is audited. */
  async moveSubcategory(id: string, categoryId: string, actorId: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id },
      include: { channels: { select: { id: true } } },
    });
    if (!subcategory) throw new NotFoundException('Subcategory not found');

    if (subcategory.categoryId === categoryId) {
      throw new BadRequestException(
        'Subcategory already belongs to that category',
      );
    }

    const destination = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });
    if (!destination)
      throw new NotFoundException('Destination category not found');
    if (!destination.isActive) {
      throw new BadRequestException('Cannot move into an archived category');
    }

    const clash = await this.prisma.subcategory.findFirst({
      where: { categoryId, slug: subcategory.slug },
    });
    if (clash) {
      throw new ConflictException(
        `Destination category already has a subcategory with slug "${subcategory.slug}"`,
      );
    }

    const [videos] = await this.countContent(
      subcategory.channels.map((c) => c.id),
    );

    const moved = await this.prisma.subcategory.update({
      where: { id },
      data: { categoryId, updatedBy: actorId },
    });

    await this.audit('SUBCATEGORY', id, 'TAXONOMY_MOVED', actorId, {
      fromCategoryId: subcategory.categoryId,
      toCategoryId: categoryId,
      affectedChannels: subcategory.channels.length,
      affectedVideos: videos,
    });

    return moved;
  }

  async reorderSubcategories(
    categoryId: string,
    ids: string[],
    actorId: string,
  ) {
    const found = await this.prisma.subcategory.findMany({
      where: { id: { in: ids }, categoryId },
      select: { id: true },
    });
    if (found.length !== ids.length) {
      throw new BadRequestException(
        'Reorder list contains subcategories from another category',
      );
    }

    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.subcategory.update({
          where: { id },
          data: { displayOrder: index + 1, updatedBy: actorId },
        }),
      ),
    );

    await this.audit('CATEGORY', categoryId, 'TAXONOMY_REORDERED', actorId, {
      order: ids,
    });

    return { reordered: ids.length };
  }

  // -------------------------------------------------------------- channels

  /**
   * Re-parent a channel. Every video in the channel changes its derived
   * Category/Subcategory, which is why the destination must be explicit.
   */
  async moveChannel(channelId: string, subcategoryId: string, actorId: string) {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });
    if (!channel) throw new NotFoundException('Channel not found');

    const subcategory = await this.assertAssignableSubcategory(subcategoryId);

    if (channel.subcategoryId === subcategoryId) {
      throw new BadRequestException(
        'Channel already belongs to that subcategory',
      );
    }

    const [videos, mediaItems] = await this.countContent([channelId]);

    const moved = await this.prisma.channel.update({
      where: { id: channelId },
      data: { subcategoryId },
    });

    await this.audit('CHANNEL', channelId, 'TAXONOMY_MOVED', actorId, {
      fromSubcategoryId: channel.subcategoryId,
      toSubcategoryId: subcategoryId,
      toCategoryId: subcategory.categoryId,
      affectedVideos: videos,
      affectedMediaItems: mediaItems,
    });

    return moved;
  }

  /** Shared by the admin channel create/update path. */
  async assertAssignableSubcategory(subcategoryId: string) {
    const subcategory = await this.prisma.subcategory.findUnique({
      where: { id: subcategoryId },
      include: { category: true },
    });

    if (!subcategory) throw new NotFoundException('Subcategory not found');
    if (!subcategory.isActive) {
      throw new BadRequestException('Cannot assign to an archived subcategory');
    }
    if (!subcategory.category.isActive) {
      throw new BadRequestException(
        'Cannot assign to a subcategory whose category is archived',
      );
    }

    return subcategory;
  }

  // --------------------------------------------------------------- helpers

  private translationRows(translations: TaxonomyTranslationDto[]) {
    return translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      description: t.description ?? null,
    }));
  }

  private async upsertCategoryTranslations(
    categoryId: string,
    translations?: TaxonomyTranslationDto[],
  ) {
    if (!translations?.length) return;

    for (const t of translations) {
      await this.prisma.categoryTranslation.upsert({
        where: { categoryId_locale: { categoryId, locale: t.locale } },
        update: { name: t.name, description: t.description ?? null },
        create: {
          categoryId,
          locale: t.locale,
          name: t.name,
          description: t.description ?? null,
        },
      });
    }
  }

  private async upsertSubcategoryTranslations(
    subcategoryId: string,
    translations?: TaxonomyTranslationDto[],
  ) {
    if (!translations?.length) return;

    for (const t of translations) {
      await this.prisma.subcategoryTranslation.upsert({
        where: { subcategoryId_locale: { subcategoryId, locale: t.locale } },
        update: { name: t.name, description: t.description ?? null },
        create: {
          subcategoryId,
          locale: t.locale,
          name: t.name,
          description: t.description ?? null,
        },
      });
    }
  }

  private async nextCategoryOrder() {
    const last = await this.prisma.category.findFirst({
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    return (last?.displayOrder ?? 0) + 1;
  }

  private async nextSubcategoryOrder(categoryId: string) {
    const last = await this.prisma.subcategory.findFirst({
      where: { categoryId },
      orderBy: { displayOrder: 'desc' },
      select: { displayOrder: true },
    });
    return (last?.displayOrder ?? 0) + 1;
  }
}
