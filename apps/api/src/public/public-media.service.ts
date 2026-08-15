import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  getContentDisposition,
  shouldInlinePreview,
} from '../media/media-policy.util';

@Injectable()
export class PublicMediaService {
  constructor(private readonly prisma: PrismaService) {}

  private toPublicUrl(bucket: string, objectKey: string) {
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }

  async listPublicMedia(locale: string, page: number) {
    const pageSize = 24;
    const where = {
      status: 'PUBLISHED' as const,
      visibility: 'PUBLIC' as const,
    };

    const [items, total] = await Promise.all([
      this.prisma.mediaItem.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
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
      items: items.map((item) => this.toPublicListItem(item, locale)),
      page,
      pageSize,
      total,
    };
  }

  async getPublicMediaBySlug(slug: string, locale: string) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { slug },
      include: {
        translations: { where: { locale: { in: [locale, 'en'] } } },
        asset: true,
        channels: { include: { channel: { include: { translations: true } } } },
        tags: { include: { tag: { include: { translations: true } } } },
        uploader: { include: { creatorProfile: true } },
      },
    });
    if (!item) return null;

    const isPubliclyVisible =
      item.status === 'PUBLISHED' &&
      (item.visibility === 'PUBLIC' || item.visibility === 'UNLISTED');
    if (!isPubliclyVisible) return null;

    const translation = this.pickTranslation(item.translations, locale);
    const asset = item.asset;
    if (!asset) return null;

    const fileUrl = this.toPublicUrl(asset.bucket, asset.originalKey);
    const previewUrl = asset.previewKey
      ? this.toPublicUrl(asset.bucket, asset.previewKey)
      : shouldInlinePreview(asset.contentType)
        ? fileUrl
        : null;
    const thumbnailUrl = asset.thumbnailKey
      ? this.toPublicUrl(asset.bucket, asset.thumbnailKey)
      : previewUrl;

    const showUploader =
      item.uploaderVisible &&
      item.uploader?.creatorProfile?.approval === 'APPROVED';

    return {
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      status: item.status,
      visibility: item.visibility,
      title: translation.title,
      description: translation.description,
      tagline: translation.tagline,
      publishedAt: item.publishedAt,
      views: item.views,
      downloads: item.downloads,
      fileUrl,
      previewUrl,
      thumbnailUrl,
      downloadUrl: fileUrl,
      contentType: asset.contentType,
      sizeBytes: asset.sizeBytes.toString(),
      originalFilename: asset.originalFilename,
      width: asset.width,
      height: asset.height,
      pageCount: asset.pageCount,
      contentDisposition: getContentDisposition(
        asset.contentType,
        asset.originalFilename || 'download',
      ),
      uploaderName: showUploader
        ? item.uploader?.displayName || item.uploader?.username || null
        : null,
      channels: item.channels.map((vc) => ({
        slug: vc.channel.slug,
        name:
          vc.channel.translations.find((t) => t.locale === locale)?.name ||
          vc.channel.translations.find((t) => t.locale === 'en')?.name ||
          vc.channel.name,
      })),
      tags: item.tags.map((vt) => ({
        slug: vt.tag.slug,
        name:
          vt.tag.translations.find((t) => t.locale === locale)?.name ||
          vt.tag.translations.find((t) => t.locale === 'en')?.name ||
          vt.tag.name,
      })),
    };
  }

  async recordView(mediaItemId: string, _req: any) {
    await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        views: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });
  }

  async recordDownload(mediaItemId: string) {
    await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: { downloads: { increment: 1 } },
    });
  }

  private pickTranslation(
    translations: Array<{
      locale: string;
      title: string | null;
      description: string | null;
      tagline: string | null;
    }>,
    locale: string,
  ) {
    const exact = translations.find((t) => t.locale === locale);
    const fallback = translations.find((t) => t.locale === 'en');
    return {
      title: exact?.title || fallback?.title || 'Untitled',
      description: exact?.description || fallback?.description || null,
      tagline: exact?.tagline || fallback?.tagline || null,
    };
  }

  private toPublicListItem(item: any, locale: string) {
    const translation = this.pickTranslation(item.translations, locale);
    const asset = item.asset;
    const thumbnailUrl = asset?.thumbnailKey
      ? this.toPublicUrl(asset.bucket, asset.thumbnailKey)
      : asset?.previewKey
        ? this.toPublicUrl(asset.bucket, asset.previewKey)
        : asset
          ? this.toPublicUrl(asset.bucket, asset.originalKey)
          : null;

    return {
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      title: translation.title,
      description: translation.description,
      thumbnailUrl,
      publishedAt: item.publishedAt,
      views: item.views,
      downloads: item.downloads,
    };
  }
}
