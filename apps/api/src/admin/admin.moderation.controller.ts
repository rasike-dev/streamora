import { Controller, Get, Post, Param, UseGuards, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('admin/moderation/queue')
  async queue(@Query('status') status: string = 'PENDING_APPROVAL') {
    const allowed = ['PENDING_APPROVAL', 'REJECTED', 'APPROVED'];
    if (!allowed.includes(status)) throw new BadRequestException('Invalid status');

    const rows = await this.prisma.video.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { translations: true, uploader: true },
    });

    return rows.map((v) => ({
      id: v.id,
      slug: v.slug,
      title: v.translations.find((x) => x.locale === 'en')?.title ?? null,
      uploaderId: v.uploaderId,
      uploaderName: v.uploader?.displayName || v.uploader?.username || null,
      createdAt: v.createdAt,
      status: v.status,
    }));
  }

  @Post('admin/videos/:id/approve')
  async approve(@Param('id') id: string) {
    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        scheduleRequested: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    const now = new Date();

    // If scheduled time has passed, publish immediately
    // Otherwise, set to APPROVED and wait for scheduler
    const nextStatus =
      video.scheduledAt && video.scheduledAt <= now
        ? 'PUBLISHED'
        : 'APPROVED';

    const v = await this.prisma.video.update({
      where: { id },
      data: {
        status: nextStatus,
        publishedAt: nextStatus === 'PUBLISHED' ? now : null,
        scheduleRequested: nextStatus === 'PUBLISHED' ? false : video.scheduleRequested,
      },
    });

    return { ok: true, id: v.id, status: v.status };
  }

  @Post('admin/videos/:id/reject')
  async reject(@Param('id') id: string) {
    const v = await this.prisma.video.update({
      where: { id },
      data: { status: 'REJECTED' },
    });

    return { ok: true, id: v.id, status: v.status };
  }

  @Post('admin/videos/:id/publish')
  async publish(@Param('id') id: string) {
    const v = await this.prisma.video.update({
      where: { id },
      data: { status: 'PUBLISHED', visibility: 'PUBLIC' },
    });

    return { ok: true, id: v.id, status: v.status };
  }
}
