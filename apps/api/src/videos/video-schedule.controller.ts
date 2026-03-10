import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CreatorVideoScheduleService } from './video-schedule.service';
import { UpdateVideoScheduleDto } from './dto/update-video-schedule.dto';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class CreatorVideoScheduleController {
  constructor(
    private readonly scheduleService: CreatorVideoScheduleService,
  ) {}

  @Patch(':id/schedule')
  async updateSchedule(
    @Param('id') videoId: string,
    @Body() dto: UpdateVideoScheduleDto,
    @Req() req: any,
  ) {
    const keycloakSub = req.user.sub;
    return this.scheduleService.updateSchedule(
      videoId,
      keycloakSub,
      dto.scheduledAt,
    );
  }
}
