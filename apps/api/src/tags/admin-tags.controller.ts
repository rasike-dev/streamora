import {
  BadRequestException,
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
import { TagStatus } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminTagsService } from './admin-tags.service';
import {
  CreateTagAliasDto,
  MergeTagDto,
  UpdateTagStatusDto,
} from './dto/admin-tags.dto';

const TAG_STATUSES: TagStatus[] = ['ACTIVE', 'PENDING', 'BLOCKED', 'MERGED'];

/**
 * Tag moderation. Unlike structural taxonomy, moderators share these powers with
 * admins because tag cleanup is day-to-day content work (proposal section 8).
 */
@Controller('admin/tags')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN', 'MODERATOR')
export class AdminTagGovernanceController {
  constructor(private readonly service: AdminTagsService) {}

  private actor(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    let parsedStatus: TagStatus | undefined;

    if (status) {
      const upper = status.toUpperCase() as TagStatus;
      if (!TAG_STATUSES.includes(upper)) {
        throw new BadRequestException(
          `status must be one of ${TAG_STATUSES.join(', ')}`,
        );
      }
      parsedStatus = upper;
    }

    return this.service.list({
      q,
      status: parsedStatus,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Get(':id/merge-preview')
  async mergePreview(
    @Param('id') id: string,
    @Query('targetTagId') targetTagId: string,
  ) {
    if (!targetTagId) {
      throw new BadRequestException('targetTagId is required');
    }
    return this.service.mergePreview(id, targetTagId);
  }

  @Post(':id/merge')
  async merge(
    @Param('id') id: string,
    @Body() dto: MergeTagDto,
    @Req() req: any,
  ) {
    return this.service.merge(id, dto.targetTagId, this.actor(req));
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateTagStatusDto,
    @Req() req: any,
  ) {
    return this.service.updateStatus(id, dto, this.actor(req));
  }

  @Post(':id/aliases')
  async addAlias(
    @Param('id') id: string,
    @Body() dto: CreateTagAliasDto,
    @Req() req: any,
  ) {
    return this.service.addAlias(id, dto, this.actor(req));
  }
}
