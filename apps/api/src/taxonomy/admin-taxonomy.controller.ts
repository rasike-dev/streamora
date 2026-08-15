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
import { TaxonomyEntityType } from '@prisma/client';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminTaxonomyService } from './admin-taxonomy.service';
import {
  CreateCategoryDto,
  CreateSubcategoryDto,
  MoveSubcategoryDto,
  ReorderDto,
  UpdateCategoryDto,
  UpdateSubcategoryDto,
} from './dto/taxonomy.dto';

const ENTITY_TYPES: TaxonomyEntityType[] = [
  'CATEGORY',
  'SUBCATEGORY',
  'CHANNEL',
  'TAG',
];

/**
 * Structural taxonomy administration. Creating and reshaping the hierarchy is
 * ADMIN-only; contributors can never reach these routes (proposal section 8).
 */
@Controller('admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADMIN')
export class AdminTaxonomyController {
  constructor(private readonly service: AdminTaxonomyService) {}

  private actor(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  @Get('taxonomy/tree')
  async tree(@Query('locale') locale = 'en') {
    return this.service.getAdminTree(locale);
  }

  @Get('taxonomy/unmapped-channels')
  async unmappedChannels(@Query('locale') locale = 'en') {
    return this.service.getUnmappedChannels(locale);
  }

  @Get('taxonomy/impact')
  async impact(
    @Query('entityType') entityType: string,
    @Query('entityId') entityId: string,
  ) {
    const normalized = (entityType || '').toUpperCase() as TaxonomyEntityType;

    if (!ENTITY_TYPES.includes(normalized)) {
      throw new BadRequestException(
        `entityType must be one of ${ENTITY_TYPES.join(', ')}`,
      );
    }
    if (!entityId) {
      throw new BadRequestException('entityId is required');
    }

    return this.service.getImpact(normalized, entityId);
  }

  @Get('taxonomy/audit')
  async audit(
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('limit') limit?: string,
  ) {
    const normalized = entityType
      ? ((entityType.toUpperCase() as TaxonomyEntityType) ?? undefined)
      : undefined;

    if (normalized && !ENTITY_TYPES.includes(normalized)) {
      throw new BadRequestException(
        `entityType must be one of ${ENTITY_TYPES.join(', ')}`,
      );
    }

    return this.service.getAuditLog({
      entityType: normalized,
      entityId,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // ------------------------------------------------------------ categories

  @Post('categories')
  async createCategory(@Body() dto: CreateCategoryDto, @Req() req: any) {
    return this.service.createCategory(dto, this.actor(req));
  }

  @Patch('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
    @Req() req: any,
  ) {
    return this.service.updateCategory(id, dto, this.actor(req));
  }

  @Post('categories/:id/archive')
  async archiveCategory(@Param('id') id: string, @Req() req: any) {
    return this.service.archiveCategory(id, this.actor(req));
  }

  @Post('categories/:id/restore')
  async restoreCategory(@Param('id') id: string, @Req() req: any) {
    return this.service.restoreCategory(id, this.actor(req));
  }

  @Post('categories/reorder')
  async reorderCategories(@Body() dto: ReorderDto, @Req() req: any) {
    return this.service.reorderCategories(dto.ids, this.actor(req));
  }

  // --------------------------------------------------------- subcategories

  @Post('subcategories')
  async createSubcategory(@Body() dto: CreateSubcategoryDto, @Req() req: any) {
    return this.service.createSubcategory(dto, this.actor(req));
  }

  @Patch('subcategories/:id')
  async updateSubcategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
    @Req() req: any,
  ) {
    return this.service.updateSubcategory(id, dto, this.actor(req));
  }

  @Post('subcategories/:id/archive')
  async archiveSubcategory(@Param('id') id: string, @Req() req: any) {
    return this.service.archiveSubcategory(id, this.actor(req));
  }

  @Post('subcategories/:id/restore')
  async restoreSubcategory(@Param('id') id: string, @Req() req: any) {
    return this.service.restoreSubcategory(id, this.actor(req));
  }

  @Post('subcategories/:id/move')
  async moveSubcategory(
    @Param('id') id: string,
    @Body() dto: MoveSubcategoryDto,
    @Req() req: any,
  ) {
    return this.service.moveSubcategory(id, dto.categoryId, this.actor(req));
  }

  @Post('categories/:id/subcategories/reorder')
  async reorderSubcategories(
    @Param('id') categoryId: string,
    @Body() dto: ReorderDto,
    @Req() req: any,
  ) {
    return this.service.reorderSubcategories(
      categoryId,
      dto.ids,
      this.actor(req),
    );
  }
}
