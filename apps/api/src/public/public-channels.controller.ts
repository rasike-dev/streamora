import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicChannelsService } from './public-channels.service';

@Controller('channels')
export class PublicChannelsController {
  constructor(private readonly publicChannelsService: PublicChannelsService) {}

  @Get(':slug')
  async getChannel(
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '12',
  ) {
    return this.publicChannelsService.getChannelBySlug(slug, {
      locale,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }
}
