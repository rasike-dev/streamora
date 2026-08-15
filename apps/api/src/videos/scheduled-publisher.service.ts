import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledPublisherService {
  private readonly logger = new Logger(ScheduledPublisherService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueVideosCron() {
    if (process.env.ENABLE_INTERNAL_CRON === 'false') return;
    await this.publishDueVideos();
  }

  async publishDueVideos() {
    await this.publishDue('video');
    await this.publishDue('media');
  }

  private async publishDue(target: 'video' | 'media') {
    const now = new Date();

    if (target === 'video') {
      const dueVideos = await this.prisma.video.findMany({
        where: {
          status: 'APPROVED',
          scheduleRequested: true,
          scheduledAt: { lte: now },
        },
        select: { id: true },
        take: 100,
      });

      if (dueVideos.length === 0) return;
      this.logger.log(`Publishing ${dueVideos.length} scheduled video(s)`);

      for (const video of dueVideos) {
        await this.prisma.video.updateMany({
          where: {
            id: video.id,
            status: 'APPROVED',
            scheduleRequested: true,
            scheduledAt: { lte: now },
          },
          data: {
            status: 'PUBLISHED',
            publishedAt: now,
            scheduleRequested: false,
          },
        });
      }
      return;
    }

    const dueMedia = await this.prisma.mediaItem.findMany({
      where: {
        status: 'APPROVED',
        scheduleRequested: true,
        scheduledAt: { lte: now },
      },
      select: { id: true },
      take: 100,
    });

    if (dueMedia.length === 0) return;
    this.logger.log(`Publishing ${dueMedia.length} scheduled media item(s)`);

    for (const item of dueMedia) {
      await this.prisma.mediaItem.updateMany({
        where: {
          id: item.id,
          status: 'APPROVED',
          scheduleRequested: true,
          scheduledAt: { lte: now },
        },
        data: {
          status: 'PUBLISHED',
          publishedAt: now,
          scheduleRequested: false,
        },
      });
    }
  }
}
