import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AdminGovernanceService } from './admin-governance.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { TakedownVideoDto } from './dto/takedown-video.dto';
import { ArchiveVideoDto } from './dto/archive-video.dto';
import { RestoreVideoDto } from './dto/restore-video.dto';

@Controller('admin/videos')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminGovernanceController {
  constructor(private readonly governanceService: AdminGovernanceService) {}

  @Post(':id/takedown')
  async takedown(
    @Param('id') id: string,
    @Body() body: TakedownVideoDto,
    @Req() req: any,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.governanceService.takedownVideo(id, adminId, body);
  }

  @Post(':id/archive')
  async archive(
    @Param('id') id: string,
    @Body() body: ArchiveVideoDto,
    @Req() req: any,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.governanceService.archiveVideo(id, adminId, body);
  }

  @Post(':id/restore')
  async restore(
    @Param('id') id: string,
    @Body() body: RestoreVideoDto,
    @Req() req: any,
  ) {
    const adminId = req.user.sub || req.user.id;
    return this.governanceService.restoreVideo(id, adminId, body);
  }
}
