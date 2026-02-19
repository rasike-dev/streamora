import { Body, Controller, Get, Patch, Post, Req, UseGuards, Param } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { VideosService } from './videos.service';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class VideosController {
  constructor(private videosService: VideosService) {}

  @Post('draft')
  async createDraft(@Req() req: any, @Body() body: any) {
    const keycloakSub = req.user.sub; // keycloak sub
    return this.videosService.createDraft(keycloakSub, body);
  }

  @Patch(':id')
  async updateDraft(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const keycloakSub = req.user.sub;
    return this.videosService.updateDraft(id, keycloakSub, body);
  }

  @Get()
  async getMyVideos(@Req() req: any) {
    const keycloakSub = req.user.sub;
    return this.videosService.findByUploader(keycloakSub);
  }
}
