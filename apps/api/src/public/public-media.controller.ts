import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  Post,
  Req,
} from '@nestjs/common';
import { PublicMediaService } from './public-media.service';

@Controller()
export class PublicMediaController {
  constructor(private readonly mediaService: PublicMediaService) {}

  @Get('media')
  list(@Query('locale') locale = 'en', @Query('page') page = '1') {
    return this.mediaService.listPublicMedia(locale, Number(page) || 1);
  }

  @Get('public/media/:slug')
  async getBySlug(
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
    @Req() req: any,
  ) {
    const item = await this.mediaService.getPublicMediaBySlug(slug, locale);
    if (!item) throw new NotFoundException('Media not found');
    await this.mediaService.recordView(item.id, req);
    return item;
  }

  @Post('public/media/:slug/download')
  async recordDownload(
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
  ) {
    const item = await this.mediaService.getPublicMediaBySlug(slug, locale);
    if (!item) throw new NotFoundException('Media not found');
    await this.mediaService.recordDownload(item.id);
    return { ok: true, downloadUrl: item.downloadUrl };
  }
}
