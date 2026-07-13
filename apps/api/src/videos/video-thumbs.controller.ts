import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class VideoThumbsController {
  constructor(private prisma: PrismaService) {}

  @Get('creator/videos/:id/thumbs')
  @UseGuards(JwtGuard)
  async thumbs(@Req() req: any, @Param('id') videoId: string) {
    const sub = req.user?.sub;
    const user = await this.prisma.user.findUnique({
      where: { externalId: sub },
    });
    const video = await this.prisma.video.findUnique({
      where: { id: videoId },
    });

    if (!user || !video || video.uploaderId !== user.id) return [];

    const thumbs = await this.prisma.videoThumbnail.findMany({
      where: { videoId },
      orderBy: { createdAt: 'asc' },
    });

    return thumbs.map((t) => ({
      id: t.id,
      bucket: t.bucket,
      objectKey: t.objectKey,
      isSelected: t.isSelected,
      timeSec: t.timeSec,
      // URL strategy: for dev you can use public bucket or signed URL later
      // We'll keep as bucket+key for now.
    }));
  }
}
