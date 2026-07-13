import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { getRolesFromRequest } from '../auth/auth-user.util';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class UploadStatusController {
  constructor(private prisma: PrismaService) {}

  @Get('uploads/:id/status')
  @UseGuards(JwtGuard)
  async status(@Req() req: any, @Param('id') id: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { externalId: sub },
    });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id },
      include: { video: true, mediaItem: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    const roles = getRolesFromRequest(req);
    const isAdmin = roles.includes('ADMIN');

    if (intent.targetKind === 'MEDIA') {
      if (
        !isAdmin &&
        intent.mediaItem?.uploaderId &&
        intent.mediaItem.uploaderId !== user.id
      ) {
        throw new ForbiddenException('Not allowed');
      }
    } else if (
      !isAdmin &&
      intent.video?.uploaderId &&
      intent.video.uploaderId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    return {
      id: intent.id,
      targetKind: intent.targetKind,
      videoId: intent.videoId,
      mediaItemId: intent.mediaItemId,
      kind: intent.mediaItem?.kind ?? null,
      status: intent.status,
      bucket: intent.bucket,
      objectKey: intent.objectKey,
      contentType: intent.contentType,
      sizeBytes: intent.sizeBytes.toString(),
      uploadedBytes: intent.uploadedBytes.toString(),
      percent:
        Number(intent.sizeBytes) > 0
          ? Math.floor(
              (Number(intent.uploadedBytes) / Number(intent.sizeBytes)) * 100,
            )
          : 0,
      lastError: intent.lastError,
      startedAt: intent.startedAt,
      completedAt: intent.completedAt,
      updatedAt: intent.updatedAt,
    };
  }
}
