import {
  Body,
  Controller,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { CreatorVideoVisibilityService } from './video-visibility.service';
import { UpdateVideoVisibilityDto } from './dto/update-video-visibility.dto';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class CreatorVideoVisibilityController {
  constructor(
    private readonly visibilityService: CreatorVideoVisibilityService,
  ) {}

  @Patch(':id/visibility')
  async updateVisibility(
    @Param('id') videoId: string,
    @Body() dto: UpdateVideoVisibilityDto,
    @Req() req: any,
  ) {
    const keycloakSub = req.user.sub;
    return this.visibilityService.updateVisibility(
      videoId,
      keycloakSub,
      dto.visibility,
    );
  }
}
