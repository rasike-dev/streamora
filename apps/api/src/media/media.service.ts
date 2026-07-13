import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MediaKind, MediaStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { writeMediaAuditLog } from './media-audit.util';

const EDITABLE_STATUSES: MediaStatus[] = [
  'DRAFT',
  'UPLOADED',
  'PROCESSING_FAILED',
  'READY',
  'REJECTED',
];

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async createDraft(
    externalId: string,
    data: {
      kind: MediaKind;
      locale?: string;
      title?: string;
      description?: string;
      tagline?: string;
      channelIds?: string[];
      tagIds?: string[];
    },
  ) {
    if (!data.kind || !['IMAGE', 'DOCUMENT'].includes(data.kind)) {
      throw new BadRequestException('kind must be IMAGE or DOCUMENT');
    }

    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });
    if (!user) throw new NotFoundException('User not found');

    const prefix = data.kind === 'IMAGE' ? 'img' : 'doc';
    const slug = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const mediaItem = await this.prisma.mediaItem.create({
      data: {
        slug,
        kind: data.kind,
        status: 'DRAFT',
        visibility: 'PRIVATE',
        uploaderId: user.id,
        uploaderVisible: false,
        translations: {
          create: {
            locale: data.locale || 'en',
            title: data.title,
            description: data.description,
            tagline: data.tagline,
          },
        },
        channels: data.channelIds?.length
          ? { create: data.channelIds.map((channelId) => ({ channelId })) }
          : undefined,
        tags: data.tagIds?.length
          ? { create: data.tagIds.map((tagId) => ({ tagId })) }
          : undefined,
      },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
        asset: true,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId: mediaItem.id,
      action: 'MEDIA_CREATED',
      actorUserId: externalId,
      metadata: { kind: data.kind },
    });

    return mediaItem;
  }

  async getById(mediaItemId: string, externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });
    if (!user) throw new NotFoundException('User not found');

    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      include: {
        translations: true,
        channels: { include: { channel: true } },
        tags: { include: { tag: true } },
        asset: true,
      },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.uploaderId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    return item;
  }

  async listMine(
    externalId: string,
    query: {
      kind?: MediaKind;
      status?: MediaStatus;
      page?: number;
      pageSize?: number;
      locale?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });
    if (!user) throw new NotFoundException('User not found');

    const page = Math.max(1, Number(query.page ?? 1));
    const pageSize = Math.min(50, Math.max(1, Number(query.pageSize ?? 20)));
    const locale = query.locale || 'en';

    const where: any = { uploaderId: user.id };
    if (query.kind) where.kind = query.kind;
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.mediaItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          translations: { where: { locale: { in: [locale, 'en'] } } },
          asset: true,
        },
      }),
      this.prisma.mediaItem.count({ where }),
    ]);

    return {
      items: items.map((item) => this.toListItem(item, locale)),
      page,
      pageSize,
      total,
    };
  }

  async updateDraft(
    mediaItemId: string,
    externalId: string,
    data: {
      translations?: Array<{
        locale: string;
        title?: string | null;
        description?: string | null;
        tagline?: string | null;
      }>;
      channelIds?: string[];
      tagIds?: string[];
    },
  ) {
    const item = await this.getOwnedItem(mediaItemId, externalId);
    if (!EDITABLE_STATUSES.includes(item.status)) {
      throw new BadRequestException('Media item cannot be edited in current status');
    }

    return this.prisma.$transaction(async (tx) => {
      if (data.translations?.length) {
        for (const t of data.translations) {
          await tx.mediaItemTranslation.upsert({
            where: {
              mediaItemId_locale: {
                mediaItemId,
                locale: t.locale,
              },
            },
            update: {
              title: t.title ?? null,
              description: t.description ?? null,
              tagline: t.tagline ?? null,
            },
            create: {
              mediaItemId,
              locale: t.locale,
              title: t.title ?? null,
              description: t.description ?? null,
              tagline: t.tagline ?? null,
            },
          });
        }
      }

      if (data.channelIds) {
        await tx.mediaItemChannel.deleteMany({ where: { mediaItemId } });
        if (data.channelIds.length) {
          await tx.mediaItemChannel.createMany({
            data: data.channelIds.map((channelId) => ({ mediaItemId, channelId })),
          });
        }
      }

      if (data.tagIds) {
        await tx.mediaItemTag.deleteMany({ where: { mediaItemId } });
        if (data.tagIds.length) {
          await tx.mediaItemTag.createMany({
            data: data.tagIds.map((tagId) => ({ mediaItemId, tagId })),
          });
        }
      }

      return tx.mediaItem.findUnique({
        where: { id: mediaItemId },
        include: {
          translations: true,
          channels: { include: { channel: true } },
          tags: { include: { tag: true } },
          asset: true,
        },
      });
    });
  }

  async submitForModeration(mediaItemId: string, externalId: string) {
    const item = await this.getOwnedItem(mediaItemId, externalId);
    if (item.status !== 'READY') {
      throw new BadRequestException('Media must be READY to submit');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: { status: 'PENDING_APPROVAL' },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId,
      action: 'MEDIA_SUBMITTED',
      actorUserId: externalId,
    });

    return { success: true, mediaItemId, status: updated.status };
  }

  async resubmit(mediaItemId: string, externalId: string) {
    const item = await this.getOwnedItem(mediaItemId, externalId);
    if (item.status !== 'REJECTED') {
      throw new BadRequestException('Only rejected media can be resubmitted');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        status: 'PENDING_APPROVAL',
        resubmittedAt: new Date(),
        moderationVersion: { increment: 1 },
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId,
      action: 'MEDIA_RESUBMITTED',
      actorUserId: externalId,
    });

    return { success: true, mediaItemId, status: updated.status };
  }

  private async getOwnedItem(mediaItemId: string, externalId: string) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });
    if (!user) throw new NotFoundException('User not found');

    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.uploaderId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    return item;
  }

  private toListItem(item: any, locale: string) {
    const exact = item.translations.find((t: any) => t.locale === locale);
    const fallback = item.translations.find((t: any) => t.locale === 'en');
    return {
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      status: item.status,
      visibility: item.visibility,
      title: exact?.title || fallback?.title || 'Untitled',
      views: item.views,
      downloads: item.downloads,
      updatedAt: item.updatedAt,
      asset: item.asset
        ? {
            contentType: item.asset.contentType,
            sizeBytes: item.asset.sizeBytes.toString(),
            thumbnailKey: item.asset.thumbnailKey,
            previewKey: item.asset.previewKey,
          }
        : null,
    };
  }
}
