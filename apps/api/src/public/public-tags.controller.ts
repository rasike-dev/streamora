import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicTagsService } from './public-tags.service';

@Controller('tags')
export class PublicTagsController {
  constructor(private readonly publicTagsService: PublicTagsService) {}

  @Get(':slug')
  async getTag(
    @Param('slug') slug: string,
    @Query('locale') locale = 'en',
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '12',
  ) {
    return this.publicTagsService.getTagBySlug(slug, {
      locale,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }
}
