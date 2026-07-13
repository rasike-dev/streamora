import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { MediaKind, MediaStatus } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { MediaService } from './media.service';
import { MediaVisibilityService } from './media-visibility.service';
import { MediaScheduleService } from './media-schedule.service';

@Controller('creator/media')
@UseGuards(JwtGuard)
export class MediaController {
  constructor(
    private mediaService: MediaService,
    private visibilityService: MediaVisibilityService,
    private scheduleService: MediaScheduleService,
  ) {}

  @Post('draft')
  createDraft(
    @Req() req: any,
    @Body()
    body: {
      kind: MediaKind;
      locale?: string;
      title?: string;
      description?: string;
      tagline?: string;
      channelIds?: string[];
      tagIds?: string[];
    },
  ) {
    return this.mediaService.createDraft(req.user.sub, body);
  }

  @Get()
  listMine(
    @Req() req: any,
    @Query('kind') kind?: MediaKind,
    @Query('status') status?: MediaStatus,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('locale') locale?: string,
  ) {
    return this.mediaService.listMine(req.user.sub, {
      kind,
      status,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      locale,
    });
  }

  @Get(':id')
  getOne(@Req() req: any, @Param('id') id: string) {
    return this.mediaService.getById(id, req.user.sub);
  }

  @Patch(':id')
  updateDraft(
    @Req() req: any,
    @Param('id') id: string,
    @Body()
    body: {
      translations?: Array<{
        locale: string;
        title?: string | null;
        description?: string | null;
        tagline?: string | null;
      }>;
      channelIds?: string[];
      tagIds?: string[];
    },
  ) {
    return this.mediaService.updateDraft(id, req.user.sub, body);
  }

  @Post(':id/submit')
  submit(@Req() req: any, @Param('id') id: string) {
    return this.mediaService.submitForModeration(id, req.user.sub);
  }

  @Post(':id/resubmit')
  resubmit(@Req() req: any, @Param('id') id: string) {
    return this.mediaService.resubmit(id, req.user.sub);
  }

  @Patch(':id/visibility')
  updateVisibility(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { visibility: 'PUBLIC' | 'UNLISTED' | 'PRIVATE' },
  ) {
    return this.visibilityService.updateVisibility(
      id,
      req.user.sub,
      body.visibility,
    );
  }

  @Patch(':id/schedule')
  updateSchedule(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { scheduledAt: string | null },
  ) {
    return this.scheduleService.updateSchedule(
      id,
      req.user.sub,
      body.scheduledAt ?? null,
    );
  }
}
