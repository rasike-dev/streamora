import { Controller, Get, Query } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
  constructor(private tagsService: TagsService) {}

  @Get()
  async findAll(@Query('locale') locale: string = 'en') {
    return this.tagsService.findAll(locale);
  }
}
