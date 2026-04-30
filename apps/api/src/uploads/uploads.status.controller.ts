import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
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
      where: { keycloakSub: sub },
    });
    if (!user) throw new NotFoundException('User not found');

    const intent = await this.prisma.uploadIntent.findUnique({
      where: { id },
      include: { video: true },
    });
    if (!intent) throw new NotFoundException('Upload intent not found');

    // Owner/admin check
    const roles: string[] = req.user?.realm_access?.roles ?? [];
    const isAdmin = roles.includes('ADMIN');

    if (
      !isAdmin &&
      intent.video.uploaderId &&
      intent.video.uploaderId !== user.id
    ) {
      throw new ForbiddenException('Not allowed');
    }

    return {
      id: intent.id,
      videoId: intent.videoId,
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
