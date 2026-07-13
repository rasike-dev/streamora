import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TakedownVideoDto } from './dto/takedown-video.dto';
import { ArchiveVideoDto } from './dto/archive-video.dto';
import { RestoreVideoDto } from './dto/restore-video.dto';
import { writeMediaAuditLog } from '../media/media-audit.util';

@Injectable()
export class AdminMediaGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async takedown(mediaItemId: string, adminId: string, body: TakedownVideoDto) {
    if (!body.reason?.trim()) {
      throw new BadRequestException('Takedown reason is required');
    }

    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: { id: true, status: true },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published media can be taken down');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        status: 'TAKEDOWN',
        takedownReason: body.reason.trim(),
        takedownNote: body.note?.trim() ?? null,
        takenDownAt: new Date(),
        takenDownBy: adminId,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId,
      action: 'MEDIA_TAKEDOWN',
      actorUserId: adminId,
      metadata: { reason: body.reason },
    });

    return updated;
  }

  async archive(mediaItemId: string, adminId: string, body: ArchiveVideoDto) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: { id: true, status: true },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published media can be archived');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        status: 'ARCHIVED',
        archivedReason: body.reason?.trim() ?? null,
        archivedNote: body.note?.trim() ?? null,
        archivedAt: new Date(),
        archivedBy: adminId,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId,
      action: 'MEDIA_ARCHIVED',
      actorUserId: adminId,
      metadata: { reason: body.reason ?? null },
    });

    return updated;
  }

  async restore(mediaItemId: string, adminId: string, body: RestoreVideoDto) {
    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
      select: { id: true, status: true },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.status !== 'TAKEDOWN' && item.status !== 'ARCHIVED') {
      throw new BadRequestException(
        'Only taken down or archived media can be restored',
      );
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        status: 'PUBLISHED',
        takedownReason: null,
        takedownNote: null,
        takenDownAt: null,
        takenDownBy: null,
        archivedReason: null,
        archivedNote: null,
        archivedAt: null,
        archivedBy: null,
      },
    });

    await writeMediaAuditLog(this.prisma, {
      mediaItemId,
      action: 'MEDIA_RESTORED',
      actorUserId: adminId,
      metadata: { note: body.note ?? null, previousStatus: item.status },
    });

    return updated;
  }
}
