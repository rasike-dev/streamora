import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ScheduledPublisherService {
  private readonly logger = new Logger(ScheduledPublisherService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async publishDueVideos() {
    const now = new Date();

    const dueVideos = await this.prisma.video.findMany({
      where: {
        status: 'APPROVED',
        scheduleRequested: true,
        scheduledAt: {
          lte: now,
        },
      },
      select: {
        id: true,
        scheduledAt: true,
      },
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
          scheduledAt: {
            lte: now,
          },
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
