import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminJobsController {
  constructor(private prisma: PrismaService) {}

  @Get('admin/jobs')
  async list(@Query('status') status: string = 'FAILED') {
    const rows = await this.prisma.processingJob.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        video: {
          include: {
            translations: true,
          },
        },
      },
    });

    return rows.map((j) => ({
      id: j.id,
      videoId: j.videoId,
      videoTitle:
        j.video.translations.find((t) => t.locale === 'en')?.title ||
        j.video.translations[0]?.title ||
        null,
      jobType: j.jobType,
      status: j.status,
      attempts: j.attempts,
      lastError: j.lastError,
      correlationId: j.correlationId,
      startedAt: j.startedAt,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
    }));
  }
}
