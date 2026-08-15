import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicVideosService } from './public-videos.service';

@Controller('videos')
export class PublicVideosController {
  constructor(private readonly publicVideosService: PublicVideosService) {}

  @Get()
  async list(
    @Query('locale') locale = 'en',
    @Query('q') q?: string,
    @Query('category') category?: string,
    @Query('subcategory') subcategory?: string,
    @Query('channel') channel?: string,
    @Query('tag') tag?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '12',
  ) {
    return this.publicVideosService.listVideos({
      locale,
      q,
      category,
      subcategory,
      channel,
      tag,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get(':slug/embed')
  async getEmbedVideo(
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
  ) {
    return this.publicVideosService.getPublicEmbedVideoBySlug(slug, locale);
  }
}
