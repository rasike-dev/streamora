import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { RejectVideoDto } from './dto/reject-video.dto';
import { writeMediaAuditLog } from '../media/media-audit.util';

@Controller()
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminMediaModerationController {
  constructor(private prisma: PrismaService) {}

  @Get('admin/media/moderation/queue')
  async queue(@Query('status') status: string = 'PENDING_APPROVAL') {
    const allowed = [
      'PENDING_APPROVAL',
      'REJECTED',
      'APPROVED',
      'PUBLISHED',
      'TAKEDOWN',
      'ARCHIVED',
    ];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const rows = await this.prisma.mediaItem.findMany({
      where: { status: status as any },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { translations: true, uploader: true, asset: true },
    });

    return rows.map((item) => ({
      id: item.id,
      slug: item.slug,
      kind: item.kind,
      title: item.translations.find((x) => x.locale === 'en')?.title ?? null,
      uploaderId: item.uploaderId,
      uploaderName:
        item.uploader?.displayName || item.uploader?.username || null,
      createdAt: item.createdAt,
      status: item.status,
      rejectionReason: item.status === 'REJECTED' ? item.rejectionReason : null,
      moderationVersion: item.moderationVersion,
      resubmittedAt: item.resubmittedAt?.toISOString() ?? null,
      asset: item.asset
        ? {
            contentType: item.asset.contentType,
            thumbnailKey: item.asset.thumbnailKey,
          }
        : null,
    }));
  }

  @Post('admin/media/:id/approve')
  async approve(@Param('id') id: string, @Req() req: any) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        scheduleRequested: true,
      },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending media can be approved');
    }

    const now = new Date();
    const nextStatus =
      item.scheduledAt && item.scheduledAt <= now ? 'PUBLISHED' : 'APPROVED';

    const updated = await this.prisma.mediaItem.update({
      where: { id },
      data: {
        status: nextStatus,
        publishedAt: nextStatus === 'PUBLISHED' ? now : null,
        scheduleRequested:
          nextStatus === 'PUBLISHED' ? false : item.scheduleRequested,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId: id,
      action: 'MEDIA_APPROVED',
      actorUserId: req.user.sub,
      metadata: { nextStatus },
    });

    return { ok: true, id: updated.id, status: updated.status };
  }

  @Post('admin/media/:id/reject')
  async reject(
    @Param('id') id: string,
    @Body() body: RejectVideoDto,
    @Req() req: any,
  ) {
    if (!body.reason?.trim()) {
      throw new BadRequestException('Rejection reason is required');
    }

    const item = await this.prisma.mediaItem.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException('Only pending media can be rejected');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: body.reason.trim(),
        rejectionNote: body.note?.trim() ?? null,
        rejectedAt: new Date(),
        rejectedBy: req.user.sub,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId: id,
      action: 'MEDIA_REJECTED',
      actorUserId: req.user.sub,
      metadata: { reason: body.reason.trim() },
    });

    return { ok: true, id: updated.id, status: updated.status };
  }

  @Post('admin/media/:id/publish')
  async publish(@Param('id') id: string, @Req() req: any) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'APPROVED' && item.status !== 'PENDING_APPROVAL') {
      throw new BadRequestException(
        'Only approved or pending media can be published',
      );
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id },
      data: {
        status: 'PUBLISHED',
        visibility: 'PUBLIC',
        publishedAt: new Date(),
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId: id,
      action: 'MEDIA_PUBLISHED',
      actorUserId: req.user.sub,
    });

    return { ok: true, id: updated.id, status: updated.status };
  }
}
