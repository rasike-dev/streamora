import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { MediaShortLinksService } from './media-short-links.service';

@Controller()
export class MediaShortLinksController {
  constructor(private readonly shortLinksService: MediaShortLinksService) {}

  @Post('media/:id/share')
  @UseGuards(JwtGuard)
  async createOrGetShortLink(@Param('id') mediaItemId: string, @Req() req: any) {
    const externalId = req.user.sub;
    const user = await this.shortLinksService.getUserByExternalId(externalId);
    if (!user) throw new NotFoundException('User not found');
    return this.shortLinksService.createOrGetShortLink(mediaItemId, user.id);
  }

  @Get('media-links/:code')
  async resolveShortLink(
    @Param('code') code: string,
    @Query('locale') locale = 'en',
  ) {
    return this.shortLinksService.resolveShortLink(code, locale);
  }
}
