import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class VideosPlaybackController {
  constructor(private prisma: PrismaService) {}

  @Get('videos/:id/playback')
  async playback(@Param('id') videoId: string) {
    const asset = await this.prisma.videoAsset.findUnique({
      where: { videoId },
    });
    if (!asset?.hlsBucket || !asset?.hlsMasterKey)
      throw new NotFoundException('Playback not ready');

    const cdnBase =
      process.env.CDN_BASE_URL || process.env.PUBLIC_ASSET_BASE_URL;
    const masterUrl = cdnBase
      ? `${cdnBase}/${asset.hlsMasterKey}`
      : `https://storage.googleapis.com/${asset.hlsBucket}/${asset.hlsMasterKey}`;

    const selectedThumb = await this.prisma.videoThumbnail.findFirst({
      where: { videoId, isSelected: true },
    });

    const thumbUrl = selectedThumb
      ? cdnBase
        ? `${cdnBase}/${selectedThumb.objectKey}`
        : `https://storage.googleapis.com/${selectedThumb.bucket}/${selectedThumb.objectKey}`
      : null;

    return { videoId, masterUrl, thumbUrl };
  }
}
