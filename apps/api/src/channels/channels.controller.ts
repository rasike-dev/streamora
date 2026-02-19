import { Controller, Get, Query } from '@nestjs/common';
import { ChannelsService } from './channels.service';

@Controller('channels')
export class ChannelsController {
  constructor(private channelsService: ChannelsService) {}

  @Get()
  async findAll(@Query('locale') locale: string = 'en') {
    return this.channelsService.findAll(locale);
  }
}
