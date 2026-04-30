import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CreatorVideoAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserByKeycloakSub(keycloakSub: string) {
    return this.prisma.user.findUnique({
      where: { keycloakSub },
    });
  }

  async getVideoAnalytics(videoId: string, userId: string, days = 30) {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        uploaderId: userId,
      },
      select: {
        id: true,
        slug: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const now = new Date();
    const from = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - Math.max(1, days) + 1,
      ),
    );

    const rows = await this.prisma.videoAnalyticsDaily.findMany({
      where: {
        videoId,
        date: {
          gte: from,
        },
      },
      orderBy: { date: 'asc' },
    });

    const totals = rows.reduce(
      (acc, row) => {
        acc.views += row.views;
        acc.uniqueViewers += row.uniqueViewers;
        acc.playStarts += row.playStarts;
        acc.completions += row.completions;
        acc.direct += row.directViews;
        acc.share += row.shareViews;
        acc.channel += row.channelViews;
        acc.tag += row.tagViews;
        acc.search += row.searchViews;
        acc.external += row.externalViews;
        acc.unknown += row.unknownViews;
        return acc;
      },
      {
        views: 0,
        uniqueViewers: 0,
        playStarts: 0,
        completions: 0,
        direct: 0,
        share: 0,
        channel: 0,
        tag: 0,
        search: 0,
        external: 0,
        unknown: 0,
      },
    );

    return {
      videoId,
      totals: {
        views: totals.views,
        uniqueViewers: totals.uniqueViewers,
        playStarts: totals.playStarts,
        completions: totals.completions,
        completionRate:
          totals.playStarts > 0
            ? Number(
                ((totals.completions / totals.playStarts) * 100).toFixed(2),
              )
            : 0,
      },
      trafficSources: {
        direct: totals.direct,
        share: totals.share,
        channel: totals.channel,
        tag: totals.tag,
        search: totals.search,
        external: totals.external,
        unknown: totals.unknown,
      },
      series: rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        views: row.views,
        completions: row.completions,
      })),
    };
  }
}
