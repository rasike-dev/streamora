import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class CreatorUploadsController {
  constructor(private prisma: PrismaService) {}

  @Get('creator/uploads')
  @UseGuards(JwtGuard)
  async myUploads(@Req() req: any) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { externalId: sub },
    });
    if (!user) return [];

    // Find intents for videos owned by this user that are not completed
    const intents = await this.prisma.uploadIntent.findMany({
      where: {
        status: { in: ['INITIATED', 'UPLOADING', 'FAILED'] },
        OR: [
          { video: { uploaderId: user.id } },
          { mediaItem: { uploaderId: user.id } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: { video: true, mediaItem: true },
    });

    return intents.map((i) => ({
      id: i.id,
      targetKind: i.targetKind,
      videoId: i.videoId,
      mediaItemId: i.mediaItemId,
      kind: i.mediaItem?.kind ?? null,
      status: i.status,
      objectKey: i.objectKey,
      sizeBytes: i.sizeBytes.toString(),
      uploadedBytes: i.uploadedBytes.toString(),
      percent:
        Number(i.sizeBytes) > 0
          ? Math.floor((Number(i.uploadedBytes) / Number(i.sizeBytes)) * 100)
          : 0,
      updatedAt: i.updatedAt,
      lastError: i.lastError,
    }));
  }
}
