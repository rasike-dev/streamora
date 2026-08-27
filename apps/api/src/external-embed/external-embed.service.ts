import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ExternalEmbedValidationStatus,
  Prisma,
  VideoSourceType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContentTaxonomyService } from '../taxonomy/content-taxonomy.service';
import { ExternalEmbedParserService } from './external-embed-parser.service';
import { ExternalEmbedValidatorService } from './external-embed-validator.service';

type CreateExternalEmbedInput = {
  input: string;
  locale?: string;
  title?: string;
  description?: string;
  tagline?: string;
  channelIds?: string[];
  tagIds?: string[];
};

@Injectable()
export class ExternalEmbedService {
  constructor(
    private prisma: PrismaService,
    private parser: ExternalEmbedParserService,
    private validator: ExternalEmbedValidatorService,
    private contentTaxonomy: ContentTaxonomyService,
  ) {}

  async createExternalEmbedVideo(externalId: string, data: CreateExternalEmbedInput) {
    const user = await this.requireUser(externalId);
    const parsed = this.parser.parseInput(data.input);
    const validation = await this.validator.validate(parsed);

    const channelIds = data.channelIds
      ? await this.contentTaxonomy.resolveChannelIdsById(data.channelIds)
      : [];
    const primaryChannelId =
      this.contentTaxonomy.resolvePrimaryChannelIdById(channelIds);

    const slug = `vid-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const status = validation.status === 'ACTIVE' ? 'READY' : 'DRAFT';
    const now = new Date();

    const video = await this.prisma.video.create({
      data: {
        slug,
        sourceType: VideoSourceType.EXTERNAL_EMBED,
        status,
        visibility: 'PRIVATE',
        uploaderId: user.id,
        uploaderVisible: false,
        primaryChannelId,
        translations: {
          create: {
            locale: data.locale || 'en',
            title: data.title,
            description: data.description,
            tagline: data.tagline,
          },
        },
        channels: channelIds.length
          ? { create: channelIds.map((channelId) => ({ channelId })) }
          : undefined,
        tags: data.tagIds
          ? {
              create: data.tagIds.map((tagId) => ({
                tagId,
                addedById: user.id,
              })),
            }
          : undefined,
        externalEmbed: {
          create: this.toEmbedCreate(parsed, validation, now),
        },
      },
      include: this.videoInclude(),
    });

    return this.serializeVideo(video);
  }

  async updateExternalEmbed(
    videoId: string,
    externalId: string,
    input: string,
  ) {
    const user = await this.requireUser(externalId);
    const video = await this.requireOwnedExternalVideo(videoId, user.id);

    const parsed = this.parser.parseInput(input);
    const validation = await this.validator.validate(parsed);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.videoExternalEmbed.update({
        where: { videoId },
        data: this.toEmbedUpdate(parsed, validation, now),
      });

      if (validation.status === 'ACTIVE' && video.status === 'DRAFT') {
        await tx.video.update({
          where: { id: videoId },
          data: { status: 'READY' },
        });
      }

      if (
        validation.status === 'UNAVAILABLE' &&
        ['READY', 'PENDING_APPROVAL', 'APPROVED'].includes(video.status)
      ) {
        await tx.video.update({
          where: { id: videoId },
          data: { status: 'DRAFT' },
        });
      }

      return tx.video.findUnique({
        where: { id: videoId },
        include: this.videoInclude(),
      });
    });

    return this.serializeVideo(updated!);
  }

  async revalidateVideoEmbed(videoId: string, externalId: string) {
    const user = await this.requireUser(externalId);
    await this.requireOwnedExternalVideo(videoId, user.id);
    return this.revalidateByVideoId(videoId);
  }

  async revalidateByVideoId(videoId: string) {
    const embed = await this.prisma.videoExternalEmbed.findUnique({
      where: { videoId },
      include: { video: { select: { id: true, status: true } } },
    });
    if (!embed) throw new NotFoundException('External embed not found');

    const parsed = {
      provider: embed.provider,
      canonicalUrl: embed.canonicalUrl,
      embedUrl: embed.embedUrl,
      embedWidth: embed.embedWidth ?? undefined,
      embedHeight: embed.embedHeight ?? undefined,
    };
    const validation = await this.validator.validate(parsed);
    const now = new Date();

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.videoExternalEmbed.update({
        where: { videoId },
        data: this.toEmbedUpdate(parsed, validation, now),
      });

      if (
        validation.status === 'UNAVAILABLE' &&
        ['READY', 'PENDING_APPROVAL', 'APPROVED'].includes(embed.video.status)
      ) {
        await tx.video.update({
          where: { id: videoId },
          data: { status: 'DRAFT' },
        });
      } else if (validation.status === 'ACTIVE' && embed.video.status === 'DRAFT') {
        await tx.video.update({
          where: { id: videoId },
          data: { status: 'READY' },
        });
      }

      return tx.videoExternalEmbed.findUnique({ where: { videoId } });
    });

    return updated;
  }

  async revalidateDueEmbeds(limit = 50) {
    const now = new Date();
    const due = await this.prisma.videoExternalEmbed.findMany({
      where: {
        OR: [
          { nextValidationAt: { lte: now } },
          {
            validationStatus: { in: ['ACTIVE', 'ERROR'] },
            OR: [{ nextValidationAt: null }, { lastValidatedAt: null }],
          },
        ],
      },
      select: { videoId: true },
      take: limit,
      orderBy: [{ nextValidationAt: 'asc' }, { lastValidatedAt: 'asc' }],
    });

    let active = 0;
    let unavailable = 0;
    let errors = 0;

    for (const row of due) {
      const result = await this.revalidateByVideoId(row.videoId);
      if (result?.validationStatus === 'ACTIVE') active += 1;
      else if (result?.validationStatus === 'UNAVAILABLE') unavailable += 1;
      else errors += 1;
    }

    return { checked: due.length, active, unavailable, errors };
  }

  assertSubmittable(
    sourceType: VideoSourceType,
    embed?: {
      validationStatus: ExternalEmbedValidationStatus;
    } | null,
  ) {
    if (sourceType !== 'EXTERNAL_EMBED') return;
    if (!embed) {
      throw new BadRequestException('External embed configuration is missing');
    }
    if (embed.validationStatus !== 'ACTIVE') {
      throw new BadRequestException(
        `External video must pass link validation before submission (current: ${embed.validationStatus})`,
      );
    }
  }

  private toEmbedCreate(
    parsed: ReturnType<ExternalEmbedParserService['parseInput']>,
    validation: Awaited<ReturnType<ExternalEmbedValidatorService['validate']>>,
    now: Date,
  ): Prisma.VideoExternalEmbedCreateWithoutVideoInput {
    return {
      provider: parsed.provider,
      canonicalUrl: parsed.canonicalUrl,
      embedUrl: parsed.embedUrl,
      embedWidth: parsed.embedWidth,
      embedHeight: parsed.embedHeight,
      oEmbedThumbnailUrl: validation.thumbnailUrl ?? null,
      validationStatus: validation.status,
      lastValidatedAt: now,
      nextValidationAt: this.nextValidationAt(validation.status, now),
      lastValidationError: validation.error ?? null,
      unavailableSince: validation.status === 'UNAVAILABLE' ? now : null,
    };
  }

  private toEmbedUpdate(
    parsed: ReturnType<ExternalEmbedParserService['parseInput']>,
    validation: Awaited<ReturnType<ExternalEmbedValidatorService['validate']>>,
    now: Date,
  ): Prisma.VideoExternalEmbedUpdateInput {
    return {
      provider: parsed.provider,
      canonicalUrl: parsed.canonicalUrl,
      embedUrl: parsed.embedUrl,
      embedWidth: parsed.embedWidth,
      embedHeight: parsed.embedHeight,
      oEmbedThumbnailUrl: validation.thumbnailUrl ?? null,
      validationStatus: validation.status,
      lastValidatedAt: now,
      nextValidationAt: this.nextValidationAt(validation.status, now),
      lastValidationError: validation.error ?? null,
      unavailableSince:
        validation.status === 'UNAVAILABLE'
          ? now
          : validation.status === 'ACTIVE'
            ? null
            : undefined,
    };
  }

  private nextValidationAt(
    status: ExternalEmbedValidationStatus | 'ACTIVE' | 'UNAVAILABLE' | 'ERROR',
    from: Date,
  ) {
    const hours =
      status === 'ACTIVE' ? 24 : status === 'UNAVAILABLE' ? 12 : status === 'ERROR' ? 6 : 1;
    return new Date(from.getTime() + hours * 60 * 60 * 1000);
  }

  private async requireUser(externalId: string) {
    const user = await this.prisma.user.findUnique({ where: { externalId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async requireOwnedExternalVideo(videoId: string, userId: string) {
    const video = await this.prisma.video.findFirst({
      where: { id: videoId, uploaderId: userId },
      select: { id: true, status: true, sourceType: true },
    });
    if (!video) throw new NotFoundException('Video not found');
    if (video.sourceType !== 'EXTERNAL_EMBED') {
      throw new BadRequestException('Video is not an external embed');
    }
    return video;
  }

  private videoInclude() {
    return {
      translations: true,
      channels: { include: { channel: true } },
      tags: { include: { tag: true } },
      externalEmbed: true,
    } as const;
  }

  private serializeVideo(video: {
    id: string;
    slug: string;
    status: string;
    visibility: string;
    sourceType: VideoSourceType;
    externalEmbed: any;
    translations: any[];
    channels: any[];
    tags: any[];
  }) {
    return {
      id: video.id,
      slug: video.slug,
      status: video.status,
      visibility: video.visibility,
      sourceType: video.sourceType,
      externalEmbed: video.externalEmbed,
      translations: video.translations,
      channels: video.channels,
      tags: video.tags,
    };
  }
}
