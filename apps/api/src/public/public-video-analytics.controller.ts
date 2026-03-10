import {
  Body,
  Controller,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { PublicVideoAnalyticsService } from './public-video-analytics.service';
import { TrackVideoAnalyticsEventDto } from './dto/track-video-analytics-event.dto';

@Controller('analytics/videos')
export class PublicVideoAnalyticsController {
  constructor(
    private readonly analyticsService: PublicVideoAnalyticsService,
  ) {}

  @Post(':id/events')
  async trackEvent(
    @Param('id') videoId: string,
    @Body() dto: TrackVideoAnalyticsEventDto,
    @Req() req: any,
  ) {
    return this.analyticsService.trackEvent(videoId, dto, req);
  }
}
