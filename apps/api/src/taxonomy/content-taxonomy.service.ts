import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Channel assignment rules shared by videos and media items.
 *
 * Both surfaces keep their existing multi-channel model; this service only adds
 * validation and the primary-channel invariant on top of it.
 */
@Injectable()
export class ContentTaxonomyService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Slug-based resolution used by the creator editor.
   *
   * Unknown or inactive slugs now raise instead of being silently dropped, which
   * is a deliberate behaviour change: the old code let a typo publish a video with
   * no channel at all.
   */
  async resolveChannelIdsBySlug(slugs: string[]): Promise<string[]> {
    const unique = [...new Set(slugs)];
    if (!unique.length) return [];

    const channels = await this.prisma.channel.findMany({
      where: { slug: { in: unique } },
      select: { id: true, slug: true, isActive: true },
    });

    const bySlug = new Map(channels.map((c) => [c.slug, c]));

    return unique.map((slug) => {
      const channel = bySlug.get(slug);
      if (!channel) {
        throw new BadRequestException(`Unknown channel "${slug}"`);
      }
      if (!channel.isActive) {
        throw new BadRequestException(
          `Channel "${slug}" is no longer available`,
        );
      }
      return channel.id;
    });
  }

  /** Id-based resolution used by the media path and the legacy video draft API. */
  async resolveChannelIdsById(ids: string[]): Promise<string[]> {
    const unique = [...new Set(ids)];
    if (!unique.length) return [];

    const channels = await this.prisma.channel.findMany({
      where: { id: { in: unique } },
      select: { id: true, slug: true, isActive: true },
    });

    const byId = new Map(channels.map((c) => [c.id, c]));

    return unique.map((id) => {
      const channel = byId.get(id);
      if (!channel) {
        throw new BadRequestException(`Unknown channel "${id}"`);
      }
      if (!channel.isActive) {
        throw new BadRequestException(
          `Channel "${channel.slug}" is no longer available`,
        );
      }
      return channel.id;
    });
  }

  /**
   * Enforces the primary-channel invariant: the primary must be one of the
   * assigned channels. Falls back to the first assigned channel so existing
   * clients that never send a primary still get a usable breadcrumb.
   */
  async resolvePrimaryChannelId(
    assignedChannelIds: string[],
    requestedPrimarySlug?: string,
  ): Promise<string | null> {
    if (!assignedChannelIds.length) return null;

    if (!requestedPrimarySlug) return assignedChannelIds[0];

    const primary = await this.prisma.channel.findUnique({
      where: { slug: requestedPrimarySlug },
      select: { id: true },
    });

    if (!primary) {
      throw new BadRequestException(
        `Unknown primary channel "${requestedPrimarySlug}"`,
      );
    }

    if (!assignedChannelIds.includes(primary.id)) {
      throw new BadRequestException(
        'The primary channel must be one of the selected channels',
      );
    }

    return primary.id;
  }

  /** Id-based variant of the same invariant, for the media path. */
  resolvePrimaryChannelIdById(
    assignedChannelIds: string[],
    requestedPrimaryId?: string,
  ): string | null {
    if (!assignedChannelIds.length) return null;
    if (!requestedPrimaryId) return assignedChannelIds[0];

    if (!assignedChannelIds.includes(requestedPrimaryId)) {
      throw new BadRequestException(
        'The primary channel must be one of the selected channels',
      );
    }

    return requestedPrimaryId;
  }
}
