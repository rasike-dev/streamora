import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TakedownVideoDto } from './dto/takedown-video.dto';
import { ArchiveVideoDto } from './dto/archive-video.dto';
import { RestoreVideoDto } from './dto/restore-video.dto';

@Injectable()
export class AdminGovernanceService {
  constructor(private readonly prisma: PrismaService) {}

  async takedownVideo(
    videoId: string,
    adminId: string,
    body: TakedownVideoDto,
  ) {
    // Validate request body
    if (
      !body.reason ||
      typeof body.reason !== 'string' ||
      body.reason.trim().length === 0
    ) {
      throw new BadRequestException('Takedown reason is required');
    }

    if (body.reason.length > 500) {
      throw new BadRequestException(
        'Takedown reason must be 500 characters or less',
      );
    }

    if (body.note && body.note.length > 2000) {
      throw new BadRequestException(
        'Takedown note must be 2000 characters or less',
      );
    }

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published videos can be taken down');
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'TAKEDOWN',
        takedownReason: body.reason.trim(),
        takedownNote: body.note?.trim() ?? null,
        takenDownAt: new Date(),
        takenDownBy: adminId,
      },
    });

    // Create audit log entry
    await this.prisma.videoAuditLog.create({
      data: {
        videoId,
        action: 'VIDEO_TAKEDOWN',
        actorUserId: adminId,
        metadata: {
          reason: body.reason,
          note: body.note || null,
        },
      },
    });

    return updated;
  }

  async archiveVideo(videoId: string, adminId: string, body: ArchiveVideoDto) {
    if (body.reason && body.reason.length > 500) {
      throw new BadRequestException(
        'Archive reason must be 500 characters or less',
      );
    }

    if (body.note && body.note.length > 2000) {
      throw new BadRequestException(
        'Archive note must be 2000 characters or less',
      );
    }

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.status !== 'PUBLISHED') {
      throw new BadRequestException('Only published videos can be archived');
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'ARCHIVED',
        archivedReason: body.reason?.trim() ?? null,
        archivedNote: body.note?.trim() ?? null,
        archivedAt: new Date(),
        archivedBy: adminId,
      },
    });

    // Create audit log entry
    await this.prisma.videoAuditLog.create({
      data: {
        videoId,
        action: 'VIDEO_ARCHIVED',
        actorUserId: adminId,
        metadata: {
          reason: body.reason || null,
          note: body.note || null,
        },
      },
    });

    return updated;
  }

  async restoreVideo(videoId: string, adminId: string, body: RestoreVideoDto) {
    if (body.note && body.note.length > 2000) {
      throw new BadRequestException(
        'Restore note must be 2000 characters or less',
      );
    }

    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (video.status !== 'TAKEDOWN' && video.status !== 'ARCHIVED') {
      throw new BadRequestException(
        'Only taken down or archived videos can be restored',
      );
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'PUBLISHED',
        // Clear governance fields on restore
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

    // Create audit log entry
    await this.prisma.videoAuditLog.create({
      data: {
        videoId,
        action: 'VIDEO_RESTORED',
        actorUserId: adminId,
        metadata: {
          note: body.note || null,
          previousStatus: video.status,
        },
      },
    });

    return updated;
  }
}
