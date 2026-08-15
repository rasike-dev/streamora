import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TagStatus, TaxonomyAuditAction } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  normalizeTagName,
  resolveUniqueSlug,
  slugify,
  validateTagName,
} from '../common/taxonomy/normalize.util';
import { CreateTagAliasDto, UpdateTagStatusDto } from './dto/admin-tags.dto';

@Injectable()
export class AdminTagsService {
  constructor(private readonly prisma: PrismaService) {}

  private async audit(
    tagId: string,
    action: TaxonomyAuditAction,
    actorUserId: string,
    metadata?: Prisma.InputJsonValue,
  ) {
    await this.prisma.taxonomyAuditLog.create({
      data: {
        entityType: 'TAG',
        entityId: tagId,
        action,
        actorUserId,
        metadata,
      },
    });
  }

  /** Paged tag list with usage counts, for the moderation screen. */
  async list(params: {
    q?: string;
    status?: TagStatus;
    page?: number;
    pageSize?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize || 25));

    const where: Prisma.TagWhereInput = {};

    if (params.status) where.status = params.status;

    if (params.q?.trim()) {
      const q = params.q.trim();
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
        { normalizedName: { contains: normalizeTagName(q) } },
      ];
    }

    const [total, tags] = await Promise.all([
      this.prisma.tag.count({ where }),
      this.prisma.tag.findMany({
        where,
        orderBy: [{ preferred: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          translations: true,
          aliases: true,
          mergedInto: { select: { id: true, slug: true, name: true } },
          _count: { select: { videos: true, mediaItems: true } },
        },
      }),
    ]);

    const creatorIds = [
      ...new Set(tags.map((t) => t.createdById).filter(Boolean)),
    ] as string[];
    const creators = creatorIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, displayName: true, username: true },
        })
      : [];
    const creatorById = new Map(creators.map((c) => [c.id, c]));

    return {
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.max(1, Math.ceil(total / pageSize)),
      },
      items: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        normalizedName: tag.normalizedName,
        status: tag.status,
        preferred: tag.preferred,
        videoCount: tag._count.videos,
        mediaItemCount: tag._count.mediaItems,
        usageCount: tag._count.videos + tag._count.mediaItems,
        aliases: tag.aliases.map((a) => a.alias),
        mergedInto: tag.mergedInto,
        createdBy: tag.createdById
          ? {
              id: tag.createdById,
              name:
                creatorById.get(tag.createdById)?.displayName ??
                creatorById.get(tag.createdById)?.username ??
                null,
            }
          : null,
        createdAt: tag.createdAt,
        translations: tag.translations.map((t) => ({
          locale: t.locale,
          name: t.name,
        })),
      })),
    };
  }

  /**
   * Admin tag creation. Unlike the contributor path this may set a custom slug and
   * translations, but it shares the same canonical-key rules so an admin cannot
   * hand-create a duplicate of an existing tag.
   */
  async createTag(input: {
    name: string;
    slug?: string;
    preferred?: boolean;
    translations?: { locale: string; name: string }[];
    actorId: string;
  }) {
    const validation = validateTagName(input.name);
    if (!validation.ok) throw new BadRequestException(validation.reason);

    const existing = await this.findByCanonicalKey(validation.normalized);
    if (existing) {
      throw new ConflictException(
        `Tag "${existing.name}" (${existing.slug}) already covers "${input.name}"`,
      );
    }

    const requestedSlug = slugify(input.slug || validation.slug);
    const slug = await resolveUniqueSlug(
      requestedSlug,
      async (candidate) =>
        (await this.prisma.tag.count({ where: { slug: candidate } })) > 0,
    );

    const tag = await this.prisma.tag.create({
      data: {
        name: validation.name,
        slug,
        normalizedName: validation.normalized,
        status: 'ACTIVE',
        preferred: input.preferred ?? false,
        createdById: input.actorId,
        translations: input.translations?.length
          ? {
              create: input.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    await this.audit(tag.id, 'TAXONOMY_CREATED', input.actorId, {
      slug: tag.slug,
      name: tag.name,
    });

    return tag;
  }

  async updateTag(
    id: string,
    input: {
      name?: string;
      slug?: string;
      preferred?: boolean;
      translations?: { locale: string; name: string }[];
      actorId: string;
    },
  ) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');

    const data: Prisma.TagUpdateInput = { preferred: input.preferred };

    if (input.name) {
      const validation = validateTagName(input.name);
      if (!validation.ok) throw new BadRequestException(validation.reason);

      if (validation.normalized !== tag.normalizedName) {
        const clash = await this.findByCanonicalKey(validation.normalized);
        if (clash && clash.id !== id) {
          throw new ConflictException(
            `Tag "${clash.name}" (${clash.slug}) already uses that name`,
          );
        }
        data.normalizedName = validation.normalized;
      }

      data.name = validation.name;
    }

    if (input.slug) {
      const slug = slugify(input.slug);
      const clash = await this.prisma.tag.findFirst({
        where: { slug, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException(`Tag slug "${slug}" is already in use`);
      }
      data.slug = slug;
    }

    const updated = await this.prisma.tag.update({ where: { id }, data });

    if (input.translations?.length) {
      for (const t of input.translations) {
        await this.prisma.tagTranslation.upsert({
          where: { tagId_locale: { tagId: id, locale: t.locale } },
          update: { name: t.name },
          create: { tagId: id, locale: t.locale, name: t.name },
        });
      }
    }

    await this.audit(id, 'TAXONOMY_UPDATED', input.actorId, {
      changed: Object.keys(input).filter((k) => k !== 'actorId'),
    });

    return updated;
  }

  /** Resolves a canonical key through both tags and their aliases. */
  private async findByCanonicalKey(normalized: string) {
    const direct = await this.prisma.tag.findFirst({
      where: { normalizedName: normalized },
    });
    if (direct) return direct;

    const alias = await this.prisma.tagAlias.findUnique({
      where: { normalizedAlias: normalized },
      include: { tag: true },
    });

    return alias?.tag ?? null;
  }

  /** Read-only preview of what a merge would do, shown before confirmation. */
  async mergePreview(sourceId: string, targetId: string) {
    const { source, target } = await this.loadMergePair(sourceId, targetId);

    const [sourceVideos, sourceMedia, sharedVideos, sharedMedia] =
      await Promise.all([
        this.prisma.videoTag.count({ where: { tagId: source.id } }),
        this.prisma.mediaItemTag.count({ where: { tagId: source.id } }),
        this.prisma.videoTag.count({
          where: {
            tagId: target.id,
            video: { tags: { some: { tagId: source.id } } },
          },
        }),
        this.prisma.mediaItemTag.count({
          where: {
            tagId: target.id,
            mediaItem: { tags: { some: { tagId: source.id } } },
          },
        }),
      ]);

    return {
      source: { id: source.id, name: source.name, slug: source.slug },
      target: { id: target.id, name: target.name, slug: target.slug },
      videosMoved: sourceVideos - sharedVideos,
      mediaItemsMoved: sourceMedia - sharedMedia,
      duplicatesDropped: sharedVideos + sharedMedia,
      aliasCreated: source.slug,
    };
  }

  /**
   * Move every assignment from `sourceId` onto `targetId`.
   *
   * The source keeps existing as a MERGED tombstone and its normalized key is
   * released into a TagAlias, so /tags/{old-slug} keeps resolving and a creator
   * typing the old name lands on the surviving tag.
   */
  async merge(sourceId: string, targetId: string, actorId: string) {
    const { source, target } = await this.loadMergePair(sourceId, targetId);

    const result = await this.prisma.$transaction(async (tx) => {
      const targetVideoIds = new Set(
        (
          await tx.videoTag.findMany({
            where: { tagId: target.id },
            select: { videoId: true },
          })
        ).map((row) => row.videoId),
      );

      const sourceVideoLinks = await tx.videoTag.findMany({
        where: { tagId: source.id },
        select: { videoId: true },
      });

      const duplicateVideoIds = sourceVideoLinks
        .map((row) => row.videoId)
        .filter((id) => targetVideoIds.has(id));

      if (duplicateVideoIds.length) {
        await tx.videoTag.deleteMany({
          where: { tagId: source.id, videoId: { in: duplicateVideoIds } },
        });
      }

      const movedVideos = await tx.videoTag.updateMany({
        where: { tagId: source.id },
        data: { tagId: target.id },
      });

      const targetMediaIds = new Set(
        (
          await tx.mediaItemTag.findMany({
            where: { tagId: target.id },
            select: { mediaItemId: true },
          })
        ).map((row) => row.mediaItemId),
      );

      const sourceMediaLinks = await tx.mediaItemTag.findMany({
        where: { tagId: source.id },
        select: { mediaItemId: true },
      });

      const duplicateMediaIds = sourceMediaLinks
        .map((row) => row.mediaItemId)
        .filter((id) => targetMediaIds.has(id));

      if (duplicateMediaIds.length) {
        await tx.mediaItemTag.deleteMany({
          where: { tagId: source.id, mediaItemId: { in: duplicateMediaIds } },
        });
      }

      const movedMedia = await tx.mediaItemTag.updateMany({
        where: { tagId: source.id },
        data: { tagId: target.id },
      });

      // Aliases pointing at the source must follow it to the target.
      await tx.tagAlias.updateMany({
        where: { tagId: source.id },
        data: { tagId: target.id },
      });

      // Free the source's canonical key first, then re-register it as an alias.
      const releasedKey =
        source.normalizedName ?? normalizeTagName(source.name);

      await tx.tag.update({
        where: { id: source.id },
        data: {
          status: 'MERGED',
          mergedIntoTagId: target.id,
          normalizedName: null,
        },
      });

      const aliasExists = await tx.tagAlias.findUnique({
        where: { normalizedAlias: releasedKey },
      });

      if (!aliasExists && releasedKey) {
        await tx.tagAlias.create({
          data: {
            tagId: target.id,
            alias: source.name,
            normalizedAlias: releasedKey,
            createdBy: actorId,
          },
        });
      }

      return {
        movedVideos: movedVideos.count,
        movedMediaItems: movedMedia.count,
        duplicatesDropped: duplicateVideoIds.length + duplicateMediaIds.length,
      };
    });

    await this.audit(target.id, 'TAG_MERGED', actorId, {
      sourceTagId: source.id,
      sourceSlug: source.slug,
      ...result,
    });

    return {
      source: { id: source.id, slug: source.slug, status: 'MERGED' },
      target: { id: target.id, slug: target.slug },
      ...result,
    };
  }

  async updateStatus(id: string, dto: UpdateTagStatusDto, actorId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');

    if (tag.status === 'MERGED') {
      throw new BadRequestException(
        'A merged tag cannot change status; act on the surviving tag instead',
      );
    }

    let removedAssignments = 0;
    const shouldDetach =
      dto.status === 'BLOCKED' && (dto.removeAssignments ?? true);

    if (shouldDetach) {
      const [videos, media] = await this.prisma.$transaction([
        this.prisma.videoTag.deleteMany({ where: { tagId: id } }),
        this.prisma.mediaItemTag.deleteMany({ where: { tagId: id } }),
      ]);
      removedAssignments = videos.count + media.count;
    }

    const updated = await this.prisma.tag.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.audit(id, 'TAG_STATUS_CHANGED', actorId, {
      from: tag.status,
      to: dto.status,
      reason: dto.reason ?? null,
      removedAssignments,
    });

    return { ...updated, removedAssignments };
  }

  async setPreferred(id: string, preferred: boolean, actorId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');

    const updated = await this.prisma.tag.update({
      where: { id },
      data: { preferred },
    });

    await this.audit(id, 'TAG_STATUS_CHANGED', actorId, {
      preferred,
    });

    return updated;
  }

  async addAlias(id: string, dto: CreateTagAliasDto, actorId: string) {
    const tag = await this.prisma.tag.findUnique({ where: { id } });
    if (!tag) throw new NotFoundException('Tag not found');

    const validation = validateTagName(dto.alias);
    if (!validation.ok) throw new BadRequestException(validation.reason);

    const clashingTag = await this.prisma.tag.findFirst({
      where: { normalizedName: validation.normalized },
    });
    if (clashingTag) {
      throw new ConflictException(
        `"${dto.alias}" is already a tag (${clashingTag.slug}); merge it instead of aliasing`,
      );
    }

    const existingAlias = await this.prisma.tagAlias.findUnique({
      where: { normalizedAlias: validation.normalized },
    });
    if (existingAlias) {
      throw new ConflictException(
        `"${dto.alias}" is already an alias of another tag`,
      );
    }

    const alias = await this.prisma.tagAlias.create({
      data: {
        tagId: id,
        alias: validation.name,
        normalizedAlias: validation.normalized,
        createdBy: actorId,
      },
    });

    await this.audit(id, 'TAG_ALIAS_ADDED', actorId, {
      alias: validation.name,
    });

    return alias;
  }

  private async loadMergePair(sourceId: string, targetId: string) {
    if (sourceId === targetId) {
      throw new BadRequestException('Cannot merge a tag into itself');
    }

    const [source, target] = await Promise.all([
      this.prisma.tag.findUnique({ where: { id: sourceId } }),
      this.prisma.tag.findUnique({ where: { id: targetId } }),
    ]);

    if (!source) throw new NotFoundException('Source tag not found');
    if (!target) throw new NotFoundException('Target tag not found');

    if (source.status === 'MERGED') {
      throw new BadRequestException('Source tag has already been merged');
    }
    if (target.status === 'MERGED') {
      throw new BadRequestException(
        'Target tag has been merged; merge into the surviving tag instead',
      );
    }
    if (target.status === 'BLOCKED') {
      throw new BadRequestException('Cannot merge into a blocked tag');
    }

    return { source, target };
  }
}
