import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, Tag } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  MAX_TAGS_PER_ITEM,
  normalizeTagName,
  resolveUniqueSlug,
  validateTagName,
} from '../common/taxonomy/normalize.util';

export type ResolveTagsInput = {
  /** Slugs of tags picked from autocomplete. */
  slugs?: string[];
  /** Free-typed names that may or may not exist yet. */
  newTags?: string[];
  /** User the assignment is attributed to. */
  actorUserId?: string;
};

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Public tag list. Only ACTIVE tags are exposed: PENDING tags are usable on the
   * video that introduced them but must not be suggested to other contributors,
   * and BLOCKED/MERGED tags must never resurface.
   */
  async findAll(locale: string = 'en', q?: string) {
    const where: Prisma.TagWhereInput = { status: 'ACTIVE' };

    if (q?.trim()) {
      const query = q.trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
        { normalizedName: { contains: normalizeTagName(query) } },
        {
          aliases: {
            some: { alias: { contains: query, mode: 'insensitive' } },
          },
        },
      ];
    }

    const tags = await this.prisma.tag.findMany({
      where,
      orderBy: [{ preferred: 'desc' }, { name: 'asc' }],
      take: q ? 20 : undefined,
      include: {
        translations: true,
      },
    });

    return tags.map((tag) => {
      const translation =
        tag.translations.find((x) => x.locale === locale) ||
        tag.translations.find((x) => x.locale === 'en') ||
        null;
      return {
        id: tag.id,
        slug: tag.slug,
        name: translation?.name || tag.name,
        preferred: tag.preferred,
      };
    });
  }

  /**
   * Resolve a mix of existing slugs and free-typed names into tag ids.
   *
   * Runs outside any caller transaction on purpose: creating a tag can hit the
   * normalizedName unique constraint under concurrency, and a failed statement
   * inside a PostgreSQL transaction would poison the whole enclosing write.
   */
  async resolveTagIds(input: ResolveTagsInput): Promise<string[]> {
    const ids: string[] = [];
    const seen = new Set<string>();

    const push = (tag: Tag) => {
      if (seen.has(tag.id)) return;
      seen.add(tag.id);
      ids.push(tag.id);
    };

    for (const slug of input.slugs ?? []) {
      push(await this.resolveExistingBySlug(slug));
    }

    if (input.newTags?.length) {
      const asPending = !(await this.isApprovedCreator(input.actorUserId));

      for (const name of input.newTags) {
        push(
          await this.findOrCreate(name, {
            actorUserId: input.actorUserId,
            asPending,
          }),
        );
      }
    }

    if (ids.length > MAX_TAGS_PER_ITEM) {
      throw new BadRequestException(
        `A maximum of ${MAX_TAGS_PER_ITEM} tags can be applied`,
      );
    }

    return ids;
  }

  /**
   * Canonical tag lookup with create-on-miss.
   *
   * Matching order is canonical key, then alias, so "Anura Kumara", "anura kumara"
   * and "#AnuraKumara" all land on the same tag, and a merged tag's old name still
   * resolves to the surviving tag.
   */
  async findOrCreate(
    name: string,
    opts: { actorUserId?: string; asPending?: boolean } = {},
  ): Promise<Tag> {
    const validation = validateTagName(name);
    if (!validation.ok) throw new BadRequestException(validation.reason);

    const existing = await this.findByCanonicalKey(validation.normalized);
    if (existing) return this.assertUsable(existing, existing.name);

    const slug = await resolveUniqueSlug(
      validation.slug,
      async (candidate) =>
        (await this.prisma.tag.count({ where: { slug: candidate } })) > 0,
    );

    try {
      return await this.prisma.tag.create({
        data: {
          name: validation.name,
          slug,
          normalizedName: validation.normalized,
          status: opts.asPending ? 'PENDING' : 'ACTIVE',
          createdById: opts.actorUserId ?? null,
        },
      });
    } catch (error) {
      // Two uploaders submitting the same new tag at the same time: the loser
      // re-reads the winner's row instead of failing the upload.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const winner = await this.findByCanonicalKey(validation.normalized);
        if (winner) return this.assertUsable(winner, validation.name);
      }
      throw error;
    }
  }

  /** True when the user is an approved creator, so their new tags go live directly. */
  async isApprovedCreator(userId?: string): Promise<boolean> {
    if (!userId) return false;

    const profile = await this.prisma.creatorProfile.findUnique({
      where: { userId },
      select: { approval: true },
    });

    return profile?.approval === 'APPROVED';
  }

  private async resolveExistingBySlug(slug: string): Promise<Tag> {
    const bySlug = await this.prisma.tag.findUnique({ where: { slug } });
    if (bySlug) return this.assertUsable(bySlug, slug);

    // A merged tag's slug survives as an alias, so old client state still works.
    const alias = await this.prisma.tagAlias.findUnique({
      where: { normalizedAlias: normalizeTagName(slug.replace(/-/g, ' ')) },
      include: { tag: true },
    });
    if (alias) return this.assertUsable(alias.tag, slug);

    throw new BadRequestException(`Unknown tag "${slug}"`);
  }

  private async findByCanonicalKey(normalized: string): Promise<Tag | null> {
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

  /** Follows merge pointers and rejects blocked tags. */
  private async assertUsable(tag: Tag, requested: string): Promise<Tag> {
    if (tag.status === 'BLOCKED') {
      throw new BadRequestException(`The tag "${requested}" is not allowed`);
    }

    if (tag.status === 'MERGED' && tag.mergedIntoTagId) {
      const survivor = await this.prisma.tag.findUnique({
        where: { id: tag.mergedIntoTagId },
      });
      if (survivor) return this.assertUsable(survivor, requested);
    }

    return tag;
  }
}
