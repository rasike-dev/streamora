import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class VideosPlaybackController {
  constructor(private prisma: PrismaService) {}

  @Get('videos/:id/playback')
  async playback(@Param('id') videoId: string) {
    const asset = await this.prisma.videoAsset.findUnique({ where: { videoId } });
    if (!asset?.hlsBucket || !asset?.hlsMasterKey) throw new NotFoundException('Playback not ready');

    const masterUrl = `https://storage.googleapis.com/${asset.hlsBucket}/${asset.hlsMasterKey}`;

    const thumbs = await this.prisma.videoThumbnail.findMany({
      where: { videoId },
      orderBy: { createdAt: 'asc' },
      take: 1,
    });

    const thumbUrl = thumbs[0]
      ? `https://storage.googleapis.com/${thumbs[0].bucket}/${thumbs[0].objectKey}`
      : null;

    return { videoId, masterUrl, thumbUrl };
  }
}
