import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Query,
  BadRequestException,
  NotFoundException,
  Req,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RejectVideoDto } from './dto/reject-video.dto';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('admin/moderation/queue')
  async queue(@Query('status') status: string = 'PENDING_APPROVAL') {
    const allowed = [
      'PENDING_APPROVAL',
      'REJECTED',
      'APPROVED',
      'PUBLISHED',
      'TAKEDOWN',
      'ARCHIVED',
    ];
    if (!allowed.includes(status))
      throw new BadRequestException('Invalid status');

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
      rejectionReason:
        v.status === 'REJECTED' ? (v as any).rejectionReason : null,
      moderationVersion: (v as any).moderationVersion ?? 1,
      resubmittedAt: (v as any).resubmittedAt
        ? (v as any).resubmittedAt.toISOString()
        : null,
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
      video.scheduledAt && video.scheduledAt <= now ? 'PUBLISHED' : 'APPROVED';

    const v = await this.prisma.video.update({
      where: { id },
      data: {
        status: nextStatus,
        publishedAt: nextStatus === 'PUBLISHED' ? now : null,
        scheduleRequested:
          nextStatus === 'PUBLISHED' ? false : video.scheduleRequested,
      },
    });

    return { ok: true, id: v.id, status: v.status };
  }

  @Post('admin/videos/:id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectVideoDto,
    @Req() req: any,
  ) {
    // Validate request body
    if (
      !body.reason ||
      typeof body.reason !== 'string' ||
      body.reason.trim().length === 0
    ) {
      throw new BadRequestException('Rejection reason is required');
    }

    if (body.reason.length > 500) {
      throw new BadRequestException(
        'Rejection reason must be 500 characters or less',
      );
    }

    if (body.note && body.note.length > 2000) {
      throw new BadRequestException(
        'Rejection note must be 2000 characters or less',
      );
    }

    const video = await this.prisma.video.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending videos can be rejected');
    }

    const v = await this.prisma.video.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: body.reason.trim(),
        rejectionNote: body.note?.trim() ?? null,
        rejectedAt: new Date(),
        rejectedBy: req.user.sub || req.user.id,
      },
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
