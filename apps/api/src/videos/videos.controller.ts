import { Body, Controller, Get, Patch, Post, Req, UseGuards, Param, Query } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { VideosService } from './videos.service';
import { UpdateVideoDraftDto } from './dto/update-video-draft.dto';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Post('draft')
  async createDraft(@Req() req: any, @Body() body: any) {
    const keycloakSub = req.user.sub; // keycloak sub
    return this.videosService.createDraft(keycloakSub, body, req.requestId);
  }

  @Get(':id')
  async getDraft(@Req() req: any, @Param('id') id: string) {
    const keycloakSub = req.user.sub;
    return this.videosService.getDraft(id, keycloakSub);
  }

  @Patch(':id')
  async updateDraft(@Req() req: any, @Param('id') id: string, @Body() body: UpdateVideoDraftDto | any) {
    const keycloakSub = req.user.sub;
    // Support both old format (for backward compatibility) and new format
    if (body.translations || body.channels || body.tags) {
      return this.videosService.updateDraftFull(id, keycloakSub, body);
    }
    // Old format (locale-based single translation)
    return this.videosService.updateDraft(id, keycloakSub, body);
  }

  @Post(':id/submit')
  async submitForModeration(@Req() req: any, @Param('id') id: string) {
    const keycloakSub = req.user.sub;
    return this.videosService.submitForModeration(id, keycloakSub);
  }

  @Get()
  async getMyVideos(
    @Req() req: any,
    @Query('locale') locale = 'en',
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('visibility') visibility?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '12',
  ) {
    const keycloakSub = req.user.sub;
    const user = await this.videosService.getUserByKeycloakSub(keycloakSub);
    if (!user) {
      throw new Error('User not found');
    }
    return this.videosService.queryMine(user.id, {
      locale,
      q,
      status,
      visibility,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }
}
