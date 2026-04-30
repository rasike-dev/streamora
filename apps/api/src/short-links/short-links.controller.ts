import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShortLinksService } from './short-links.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';

@Controller()
export class ShortLinksController {
  constructor(private readonly shortLinksService: ShortLinksService) {}

  @Post('videos/:id/share')
  @UseGuards(JwtGuard, RolesGuard)
  async createOrGetShortLink(@Param('id') videoId: string, @Req() req: any) {
    const keycloakSub = req.user.sub;
    const user = await this.shortLinksService.getUserByKeycloakSub(keycloakSub);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.shortLinksService.createOrGetShortLink(videoId, user.id);
  }

  @Get('short-links/:code')
  async resolveShortLink(
    @Param('code') code: string,
    @Query('locale') locale?: string,
  ) {
    return this.shortLinksService.resolveShortLink(code, locale ?? 'en');
  }
}
