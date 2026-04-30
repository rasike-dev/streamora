import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

const SCHEDULE_EDITABLE_STATUSES = [
  'DRAFT',
  'READY',
  'PENDING_APPROVAL',
  'APPROVED',
];

@Injectable()
export class CreatorVideoScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSchedule(
    videoId: string,
    keycloakSub: string,
    scheduledAt: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { keycloakSub },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        uploaderId: user.id,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (!SCHEDULE_EDITABLE_STATUSES.includes(video.status)) {
      throw new BadRequestException(
        'Video schedule is not editable in current status',
      );
    }

    let parsedDate: Date | null = null;

    if (scheduledAt !== null) {
      parsedDate = new Date(scheduledAt);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new BadRequestException('Invalid scheduledAt date');
      }

      const now = new Date();
      if (parsedDate <= now) {
        throw new BadRequestException('scheduledAt must be in the future');
      }
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: {
        scheduledAt: parsedDate,
        scheduleRequested: parsedDate !== null,
      },
      select: {
        id: true,
        status: true,
        scheduledAt: true,
        scheduleRequested: true,
      },
    });

    return {
      success: true,
      videoId: updated.id,
      status: updated.status,
      scheduledAt: updated.scheduledAt,
      scheduleRequested: updated.scheduleRequested,
    };
  }
}
