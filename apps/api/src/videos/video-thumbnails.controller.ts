import {
  BadRequestException,
  Controller,
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
import { CreatorVideoThumbnailsService } from './video-thumbnails.service';

interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
  originalname?: string;
}

@Controller('creator/videos/:id/thumbnails')
@UseGuards(JwtGuard)
export class CreatorVideoThumbnailsController {
  constructor(
    private readonly thumbnailsService: CreatorVideoThumbnailsService,
  ) {}

  @Get()
  async list(@Param('id') videoId: string, @Req() req: any) {
    const keycloakSub = req.user.sub;
    return this.thumbnailsService.list(videoId, keycloakSub);
  }

  @Post(':thumbnailId/select')
  async select(
    @Param('id') videoId: string,
    @Param('thumbnailId') thumbnailId: string,
    @Req() req: any,
  ) {
    const keycloakSub = req.user.sub;
    return this.thumbnailsService.select(videoId, thumbnailId, keycloakSub);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async upload(
    @Param('id') videoId: string,
    @UploadedFile() file: UploadedFile,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Thumbnail file is required');
    }

    const keycloakSub = req.user.sub;
    return this.thumbnailsService.uploadCustom(videoId, keycloakSub, file);
  }
}
