import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VideoAnalyticsEventType, VideoTrafficSource } from '@prisma/client';
import { createHash } from 'crypto';

@Injectable()
export class PublicVideoAnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  private hashValue(value?: string | null) {
    if (!value) return null;
    return createHash('sha256').update(value).digest('hex');
  }

  private getUtcDateOnly(date = new Date()) {
    return new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    );
  }

  async trackEvent(videoId: string, dto: any, req: any) {
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        status: 'PUBLISHED',
        visibility: {
          in: ['PUBLIC', 'UNLISTED'],
        },
      },
      select: {
        id: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const now = new Date();
    const dateOnly = this.getUtcDateOnly(now);
    const nextDay = new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000);
    const userAgent = req.headers['user-agent'] || null;
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : req.ip || null;

    const viewerHash = this.hashValue(
      [dto.sessionId, userAgent || '', ip || ''].join('|'),
    );
    const ipHash = this.hashValue(ip);

    // Check for existing unique viewer for PLAY_START
    const existingUniqueForDay =
      dto.eventType === 'PLAY_START'
        ? await this.prisma.videoAnalyticsEvent.findFirst({
            where: {
              videoId,
              eventType: 'PLAY_START',
              viewerHash,
              createdAt: {
                gte: dateOnly,
                lt: nextDay,
              },
            },
            select: { id: true },
          })
        : null;

    const isFirstUniqueStartToday =
      dto.eventType === 'PLAY_START' && !existingUniqueForDay;

    // Check for existing completion for this session/day
    const existingCompletion =
      dto.eventType === 'PLAY_COMPLETE'
        ? await this.prisma.videoAnalyticsEvent.findFirst({
            where: {
              videoId,
              sessionId: dto.sessionId,
              eventType: 'PLAY_COMPLETE',
              createdAt: {
                gte: dateOnly,
                lt: nextDay,
              },
            },
            select: { id: true },
          })
        : null;

    const isNewCompletion =
      dto.eventType === 'PLAY_COMPLETE' && !existingCompletion;

    // Create raw event
    await this.prisma.videoAnalyticsEvent.create({
      data: {
        videoId,
        eventType: dto.eventType as VideoAnalyticsEventType,
        trafficSource: (dto.trafficSource || 'UNKNOWN') as VideoTrafficSource,
        sessionId: dto.sessionId,
        viewerHash,
        ipHash,
        locale: dto.locale || null,
        progressPercent: dto.progressPercent ?? null,
        positionSeconds: dto.positionSeconds ?? null,
        durationSeconds: dto.durationSeconds ?? null,
        referrerHost: req.headers['referer']
          ? (() => {
              try {
                return new URL(req.headers['referer']).host;
              } catch {
                return null;
              }
            })()
          : null,
        userAgent,
        createdAt: now,
      },
    });

    // Update aggregates for PLAY_START
    if (dto.eventType === 'PLAY_START') {
      const trafficSource = (dto.trafficSource ||
        'UNKNOWN') as VideoTrafficSource;

      await this.prisma.$transaction([
        this.prisma.videoAnalyticsDaily.upsert({
          where: {
            videoId_date: {
              videoId,
              date: dateOnly,
            },
          },
          update: {
            views: { increment: 1 },
            playStarts: { increment: 1 },
            uniqueViewers: isFirstUniqueStartToday
              ? { increment: 1 }
              : undefined,
            lastViewedAt: now,
            ...(trafficSource === 'DIRECT'
              ? { directViews: { increment: 1 } }
              : {}),
            ...(trafficSource === 'SHARE'
              ? { shareViews: { increment: 1 } }
              : {}),
            ...(trafficSource === 'CHANNEL'
              ? { channelViews: { increment: 1 } }
              : {}),
            ...(trafficSource === 'TAG' ? { tagViews: { increment: 1 } } : {}),
            ...(trafficSource === 'SEARCH'
              ? { searchViews: { increment: 1 } }
              : {}),
            ...(trafficSource === 'EXTERNAL'
              ? { externalViews: { increment: 1 } }
              : {}),
            ...(trafficSource === 'UNKNOWN'
              ? { unknownViews: { increment: 1 } }
              : {}),
          },
          create: {
            videoId,
            date: dateOnly,
            views: 1,
            playStarts: 1,
            uniqueViewers: isFirstUniqueStartToday ? 1 : 0,
            completions: 0,
            directViews: trafficSource === 'DIRECT' ? 1 : 0,
            shareViews: trafficSource === 'SHARE' ? 1 : 0,
            channelViews: trafficSource === 'CHANNEL' ? 1 : 0,
            tagViews: trafficSource === 'TAG' ? 1 : 0,
            searchViews: trafficSource === 'SEARCH' ? 1 : 0,
            externalViews: trafficSource === 'EXTERNAL' ? 1 : 0,
            unknownViews: trafficSource === 'UNKNOWN' ? 1 : 0,
            lastViewedAt: now,
          },
        }),
        this.prisma.video.update({
          where: { id: videoId },
          data: {
            analyticsViews: { increment: 1 },
            analyticsLastViewedAt: now,
          },
        }),
      ]);
    }

    // Update aggregates for PLAY_COMPLETE
    if (dto.eventType === 'PLAY_COMPLETE' && isNewCompletion) {
      await this.prisma.$transaction([
        this.prisma.videoAnalyticsDaily.upsert({
          where: {
            videoId_date: {
              videoId,
              date: dateOnly,
            },
          },
          update: {
            completions: { increment: 1 },
            lastViewedAt: now,
          },
          create: {
            videoId,
            date: dateOnly,
            views: 0,
            uniqueViewers: 0,
            playStarts: 0,
            completions: 1,
            directViews: 0,
            shareViews: 0,
            channelViews: 0,
            tagViews: 0,
            searchViews: 0,
            externalViews: 0,
            unknownViews: 0,
            lastViewedAt: now,
          },
        }),
        this.prisma.video.update({
          where: { id: videoId },
          data: {
            analyticsCompletions: { increment: 1 },
            analyticsLastViewedAt: now,
          },
        }),
      ]);
    }

    return { success: true };
  }
}
