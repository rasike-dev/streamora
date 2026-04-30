import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/jwt.guard';
import { VideoSubtitlesService } from './video-subtitles.service';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class VideoSubtitlesController {
  constructor(private readonly subtitlesService: VideoSubtitlesService) {}

  @Get(':id/subtitles')
  async listSubtitles(@Param('id') videoId: string, @Req() req: any) {
    const userId = req.user.sub || req.user.id;
    return this.subtitlesService.listSubtitles(videoId, userId);
  }

  @Post(':id/subtitles')
  @UseInterceptors(FileInterceptor('file'))
  async uploadSubtitle(
    @Param('id') videoId: string,
    @Req() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = req.user.sub || req.user.id;
    const locale = req.body.locale;

    if (!locale) {
      throw new BadRequestException('Locale is required');
    }

    return this.subtitlesService.uploadSubtitle(videoId, locale, file, userId);
  }

  @Delete(':id/subtitles/:locale')
  async deleteSubtitle(
    @Param('id') videoId: string,
    @Param('locale') locale: string,
    @Req() req: any,
  ) {
    const userId = req.user.sub || req.user.id;
    return this.subtitlesService.deleteSubtitle(videoId, locale, userId);
  }
}
