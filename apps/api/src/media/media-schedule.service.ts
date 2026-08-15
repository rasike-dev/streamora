import {
  BadRequestException,
  ForbiddenException,
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
export class MediaScheduleService {
  constructor(private prisma: PrismaService) {}

  async updateSchedule(
    mediaItemId: string,
    externalId: string,
    scheduledAt: string | null,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { externalId },
    });
    if (!user) throw new NotFoundException('User not found');

    const item = await this.prisma.mediaItem.findUnique({
      where: { id: mediaItemId },
    });
    if (!item) throw new NotFoundException('Media item not found');
    if (item.uploaderId !== user.id) {
      throw new ForbiddenException('Not authorized');
    }
    if (!SCHEDULE_EDITABLE_STATUSES.includes(item.status)) {
      throw new BadRequestException(
        'Schedule cannot be changed in current status',
      );
    }

    let parsed: Date | null = null;
    if (scheduledAt) {
      parsed = new Date(scheduledAt);
      if (Number.isNaN(parsed.getTime())) {
        throw new BadRequestException('Invalid scheduledAt');
      }
      if (parsed <= new Date()) {
        throw new BadRequestException('scheduledAt must be in the future');
      }
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: {
        scheduledAt: parsed,
        scheduleRequested: parsed != null,
      },
    });

    return {
      ok: true,
      id: updated.id,
      scheduledAt: updated.scheduledAt,
      scheduleRequested: updated.scheduleRequested,
    };
  }
}
