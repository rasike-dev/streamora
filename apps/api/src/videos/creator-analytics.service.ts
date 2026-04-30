import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreatorAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByKeycloakSub(keycloakSub: string) {
    return this.prisma.user.findUnique({
      where: { keycloakSub },
    });
  }

  async getCreatorOverview(userId: string, locale: string, days: number) {
    const startDate = this.getStartDate(days);

    const creatorVideos = await this.prisma.video.findMany({
      where: {
        uploaderId: userId,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    const videoIds = creatorVideos.map((v) => v.id);

    if (videoIds.length === 0) {
      return {
        rangeDays: days,
        totals: {
          views: 0,
          uniqueViewers: 0,
          playStarts: 0,
          completions: 0,
          completionRate: 0,
        },
        trafficSources: {
          directViews: 0,
          shareViews: 0,
          channelViews: 0,
          tagViews: 0,
          searchViews: 0,
          externalViews: 0,
          unknownViews: 0,
        },
        dailyTrend: [],
        topVideos: [],
      };
    }

    const dailyRows = await this.prisma.videoAnalyticsDaily.findMany({
      where: {
        videoId: { in: videoIds },
        date: { gte: startDate },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const totals = dailyRows.reduce(
      (acc, row) => {
        acc.views += row.views;
        acc.uniqueViewers += row.uniqueViewers;
        acc.playStarts += row.playStarts;
        acc.completions += row.completions;

        acc.directViews += row.directViews;
        acc.shareViews += row.shareViews;
        acc.channelViews += row.channelViews;
        acc.tagViews += row.tagViews;
        acc.searchViews += row.searchViews;
        acc.externalViews += row.externalViews;
        acc.unknownViews += row.unknownViews;

        return acc;
      },
      {
        views: 0,
        uniqueViewers: 0,
        playStarts: 0,
        completions: 0,
        directViews: 0,
        shareViews: 0,
        channelViews: 0,
        tagViews: 0,
        searchViews: 0,
        externalViews: 0,
        unknownViews: 0,
      },
    );

    const completionRate =
      totals.playStarts > 0
        ? Number(((totals.completions / totals.playStarts) * 100).toFixed(2))
        : 0;

    const trendMap = new Map<
      string,
      {
        date: string;
        views: number;
        uniqueViewers: number;
        playStarts: number;
        completions: number;
      }
    >();

    for (const row of dailyRows) {
      const key = row.date.toISOString().slice(0, 10);
      const existing = trendMap.get(key) ?? {
        date: key,
        views: 0,
        uniqueViewers: 0,
        playStarts: 0,
        completions: 0,
      };

      existing.views += row.views;
      existing.uniqueViewers += row.uniqueViewers;
      existing.playStarts += row.playStarts;
      existing.completions += row.completions;

      trendMap.set(key, existing);
    }

    const dailyTrend = Array.from(trendMap.values());

    const perVideoDaily = await this.prisma.videoAnalyticsDaily.groupBy({
      by: ['videoId'],
      where: {
        videoId: { in: videoIds },
        date: { gte: startDate },
      },
      _sum: {
        views: true,
        playStarts: true,
        completions: true,
      },
      _max: {
        lastViewedAt: true,
      },
      orderBy: {
        _sum: {
          views: 'desc',
        },
      },
      take: 5,
    });

    const topVideoIds = perVideoDaily.map((v) => v.videoId);

    const videoMeta = await this.prisma.video.findMany({
      where: {
        id: { in: topVideoIds },
      },
      select: {
        id: true,
        slug: true,
        translations: {
          where: {
            locale: locale,
          },
          select: {
            title: true,
          },
          take: 1,
        },
        thumbnails: {
          where: {
            isSelected: true,
          },
          select: {
            bucket: true,
            objectKey: true,
          },
          take: 1,
        },
      },
    });

    const fallbackTitles = await this.prisma.video.findMany({
      where: {
        id: { in: topVideoIds },
      },
      select: {
        id: true,
        translations: {
          where: {
            locale: 'en',
          },
          select: {
            title: true,
          },
          take: 1,
        },
      },
    });

    const metaMap = new Map(videoMeta.map((v) => [v.id, v]));
    const fallbackMap = new Map(fallbackTitles.map((v) => [v.id, v]));

    const topVideos = perVideoDaily.map((row) => {
      const meta = metaMap.get(row.videoId);
      const fallback = fallbackMap.get(row.videoId);

      const title =
        meta?.translations?.[0]?.title ||
        fallback?.translations?.[0]?.title ||
        'Untitled';

      const views = row._sum.views ?? 0;
      const playStarts = row._sum.playStarts ?? 0;
      const completions = row._sum.completions ?? 0;

      return {
        videoId: row.videoId,
        slug: meta?.slug ?? '',
        title,
        thumbnailUrl: this.buildThumbnailUrl(
          meta?.thumbnails?.[0]?.bucket,
          meta?.thumbnails?.[0]?.objectKey,
        ),
        views,
        playStarts,
        completions,
        completionRate:
          playStarts > 0
            ? Number(((completions / playStarts) * 100).toFixed(2))
            : 0,
        lastViewedAt: row._max.lastViewedAt,
      };
    });

    return {
      rangeDays: days,
      totals: {
        views: totals.views,
        uniqueViewers: totals.uniqueViewers,
        playStarts: totals.playStarts,
        completions: totals.completions,
        completionRate,
      },
      trafficSources: {
        directViews: totals.directViews,
        shareViews: totals.shareViews,
        channelViews: totals.channelViews,
        tagViews: totals.tagViews,
        searchViews: totals.searchViews,
        externalViews: totals.externalViews,
        unknownViews: totals.unknownViews,
      },
      dailyTrend,
      topVideos,
    };
  }

  private getStartDate(days: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (days - 1));
    return d;
  }

  private buildThumbnailUrl(bucket?: string, objectKey?: string | null) {
    if (!bucket || !objectKey) return null;
    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    if (cdnBase) return `${cdnBase}/${objectKey}`;
    return `https://storage.googleapis.com/${bucket}/${objectKey}`;
  }
}
