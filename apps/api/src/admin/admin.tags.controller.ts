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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminTagsService } from '../tags/admin-tags.service';

/**
 * Admin tag authoring. Delegates to AdminTagsService so slug and canonical-key
 * rules are identical to the contributor path; an admin cannot create a tag that
 * duplicates an existing one under a different casing or spacing.
 */
@Controller()
export class AdminTagsController {
  constructor(private readonly tags: AdminTagsService) {}

  private actor(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  @Post('admin/tags')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body()
    body: {
      name: string;
      slug?: string;
      preferred?: boolean;
      translations?: { locale: string; name: string }[];
    },
    @Req() req: any,
  ) {
    return this.tags.createTag({ ...body, actorId: this.actor(req) });
  }

  @Patch('admin/tags/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      preferred?: boolean;
      translations?: { locale: string; name: string }[];
    },
    @Req() req: any,
  ) {
    return this.tags.updateTag(id, { ...body, actorId: this.actor(req) });
  }
}
