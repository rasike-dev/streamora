import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { ExternalEmbedService } from './external-embed.service';

@Controller('creator/videos')
@UseGuards(JwtGuard)
export class ExternalEmbedController {
  constructor(private readonly externalEmbedService: ExternalEmbedService) {}

  @Post('external-embed')
  async create(@Req() req: any, @Body() body: any) {
    return this.externalEmbedService.createExternalEmbedVideo(req.user.sub, body);
  }

  @Patch(':id/external-embed')
  async update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { input: string },
  ) {
    return this.externalEmbedService.updateExternalEmbed(
      id,
      req.user.sub,
      body.input,
    );
  }

  @Post(':id/external-embed/revalidate')
  async revalidate(@Req() req: any, @Param('id') id: string) {
    const embed = await this.externalEmbedService.revalidateVideoEmbed(
      id,
      req.user.sub,
    );
    return { ok: true, externalEmbed: embed };
  }
}
