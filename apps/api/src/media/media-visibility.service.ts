import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { VideoVisibility } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const VISIBILITY_EDITABLE_STATUSES = [
  'DRAFT',
  'READY',
  'REJECTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'PUBLISHED',
];

@Injectable()
export class MediaVisibilityService {
  constructor(private prisma: PrismaService) {}

  async updateVisibility(
    mediaItemId: string,
    externalId: string,
    visibility: VideoVisibility,
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
    if (!VISIBILITY_EDITABLE_STATUSES.includes(item.status)) {
      throw new BadRequestException('Visibility cannot be changed in current status');
    }

    const updated = await this.prisma.mediaItem.update({
      where: { id: mediaItemId },
      data: { visibility },
    });

    return { ok: true, id: updated.id, visibility: updated.visibility };
  }
}
