import { Controller, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminMediaGovernanceService } from './admin-media-governance.service';
import { TakedownVideoDto } from './dto/takedown-video.dto';
import { ArchiveVideoDto } from './dto/archive-video.dto';
import { RestoreVideoDto } from './dto/restore-video.dto';

@Controller('admin/media')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminMediaGovernanceController {
  constructor(private governance: AdminMediaGovernanceService) {}

  @Post(':id/takedown')
  takedown(
    @Param('id') id: string,
    @Body() body: TakedownVideoDto,
    @Req() req: any,
  ) {
    return this.governance.takedown(id, req.user.sub, body);
  }

  @Post(':id/archive')
  archive(
    @Param('id') id: string,
    @Body() body: ArchiveVideoDto,
    @Req() req: any,
  ) {
    return this.governance.archive(id, req.user.sub, body);
  }

  @Post(':id/restore')
  restore(
    @Param('id') id: string,
    @Body() body: RestoreVideoDto,
    @Req() req: any,
  ) {
    return this.governance.restore(id, req.user.sub, body);
  }
}
