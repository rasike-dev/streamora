import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CreatorVideoAnalyticsService } from './creator-video-analytics.service';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class CreatorVideoAnalyticsController {
  constructor(
    private readonly analyticsService: CreatorVideoAnalyticsService,
  ) {}

  @Get(':id/analytics')
  async getAnalytics(
    @Param('id') videoId: string,
    @Req() req: any,
    @Query('days') days = '30',
  ) {
    const keycloakSub = req.user.sub;
    const user = await this.analyticsService.getUserByKeycloakSub(keycloakSub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.analyticsService.getVideoAnalytics(
      videoId,
      user.id,
      Number(days),
    );
  }
}
