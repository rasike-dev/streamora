import {
  Controller,
  Get,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CreatorAnalyticsService } from './creator-analytics.service';
import { CreatorAnalyticsOverviewQueryDto } from './dto/creator-analytics-overview-query.dto';

@Controller('creator/analytics')
@UseGuards(JwtGuard)
export class CreatorAnalyticsController {
  constructor(
    private readonly creatorAnalyticsService: CreatorAnalyticsService,
  ) {}

  @Get('overview')
  async getOverview(
    @Req() req: any,
    @Query() query: CreatorAnalyticsOverviewQueryDto,
  ) {
    const externalId = req.user.sub;
    const user =
      await this.creatorAnalyticsService.getUserByExternalId(externalId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const locale = req.headers['x-locale'] || req.query.locale || 'en';

    // Validate and normalize days parameter
    let days = Number(query.days ?? 30);
    if (isNaN(days) || days < 1) {
      days = 30;
    }
    if (days !== 7 && days !== 30) {
      days = 30;
    }

    return this.creatorAnalyticsService.getCreatorOverview(
      user.id,
      locale,
      days,
    );
  }
}
