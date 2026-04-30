import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
export class CreatorVideoVisibilityService {
  constructor(private readonly prisma: PrismaService) {}

  async updateVisibility(
    videoId: string,
    keycloakSub: string,
    visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE',
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
        visibility: true,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found');
    }

    if (!VISIBILITY_EDITABLE_STATUSES.includes(video.status)) {
      throw new BadRequestException(
        'Video visibility is not editable in current status',
      );
    }

    const updated = await this.prisma.video.update({
      where: { id: videoId },
      data: { visibility },
      select: {
        id: true,
        visibility: true,
        status: true,
      },
    });

    return {
      success: true,
      videoId: updated.id,
      status: updated.status,
      visibility: updated.visibility,
    };
  }
}
