import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicVideoAnalyticsService } from './public-video-analytics.service';
import { TrackVideoAnalyticsEventDto } from './dto/track-video-analytics-event.dto';

@Controller('analytics/videos')
export class PublicVideoAnalyticsController {
  constructor(private readonly analyticsService: PublicVideoAnalyticsService) {}

  @Post(':id/events')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests per minute
  async trackEvent(
    @Param('id') videoId: string,
    @Body() dto: TrackVideoAnalyticsEventDto,
    @Req() req: any,
  ) {
    return this.analyticsService.trackEvent(videoId, dto, req);
  }
}
