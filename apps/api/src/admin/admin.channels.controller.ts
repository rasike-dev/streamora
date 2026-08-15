import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminTaxonomyService } from '../taxonomy/admin-taxonomy.service';
import { resolveUniqueSlug, slugify } from '../common/taxonomy/normalize.util';

@Controller()
export class AdminChannelsController {
  constructor(
    private prisma: PrismaService,
    private taxonomy: AdminTaxonomyService,
  ) {}

  private actor(req: any): string {
    return req.user?.sub || req.user?.id;
  }

  @Get('admin/channels')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async list(@Query('subcategoryId') subcategoryId?: string) {
    return this.prisma.channel.findMany({
      where: subcategoryId ? { subcategoryId } : undefined,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: {
        translations: true,
        subcategory: { include: { category: true } },
        _count: { select: { videos: true, mediaItems: true } },
      },
    });
  }

  @Post('admin/channels')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body()
    body: {
      name: string;
      slug?: string;
      subcategoryId: string;
      sortOrder?: number;
      translations?: { locale: string; name: string; description?: string }[];
    },
    @Req() req: any,
  ) {
    if (!body.subcategoryId) {
      throw new BadRequestException(
        'subcategoryId is required so the channel appears in the browse hierarchy',
      );
    }

    await this.taxonomy.assertAssignableSubcategory(body.subcategoryId);

    const slug = await resolveUniqueSlug(
      slugify(body.slug || body.name),
      async (candidate) =>
        (await this.prisma.channel.count({ where: { slug: candidate } })) > 0,
    );

    const channel = await this.prisma.channel.create({
      data: {
        name: body.name,
        slug,
        subcategoryId: body.subcategoryId,
        sortOrder: body.sortOrder ?? 0,
        translations: body.translations
          ? {
              create: body.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
                description: t.description ?? null,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    await this.prisma.taxonomyAuditLog.create({
      data: {
        entityType: 'CHANNEL',
        entityId: channel.id,
        action: 'TAXONOMY_CREATED',
        actorUserId: this.actor(req),
        metadata: { slug: channel.slug, subcategoryId: body.subcategoryId },
      },
    });

    return channel;
  }

  @Patch('admin/channels/:id')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async update(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      slug?: string;
      subcategoryId?: string;
      isActive?: boolean;
      sortOrder?: number;
      translations?: { locale: string; name: string; description?: string }[];
    },
    @Req() req: any,
  ) {
    const existing = await this.prisma.channel.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Channel not found');

    if (body.subcategoryId) {
      await this.taxonomy.assertAssignableSubcategory(body.subcategoryId);
    }

    let slug = existing.slug;
    if (body.slug && slugify(body.slug) !== existing.slug) {
      slug = slugify(body.slug);
      const clash = await this.prisma.channel.findFirst({
        where: { slug, id: { not: id } },
      });
      if (clash) {
        throw new ConflictException(`Channel slug "${slug}" is already in use`);
      }
    }

    const channel = await this.prisma.channel.update({
      where: { id },
      data: {
        name: body.name,
        slug,
        subcategoryId: body.subcategoryId,
        isActive: body.isActive,
        sortOrder: body.sortOrder,
      },
    });

    if (body.translations?.length) {
      for (const t of body.translations) {
        await this.prisma.channelTranslation.upsert({
          where: {
            channelId_locale: {
              channelId: id,
              locale: t.locale,
            },
          },
          update: {
            name: t.name,
            description: t.description ?? null,
          },
          create: {
            channelId: id,
            locale: t.locale,
            name: t.name,
            description: t.description ?? null,
          },
        });
      }
    }

    await this.prisma.taxonomyAuditLog.create({
      data: {
        entityType: 'CHANNEL',
        entityId: id,
        action: 'TAXONOMY_UPDATED',
        actorUserId: this.actor(req),
        metadata: { changed: Object.keys(body) },
      },
    });

    return channel;
  }

  /**
   * Re-parenting is a separate endpoint rather than a field update because it
   * re-classifies every video in the channel and must always be audited.
   */
  @Post('admin/channels/:id/move')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async move(
    @Param('id') id: string,
    @Body() body: { subcategoryId: string },
    @Req() req: any,
  ) {
    if (!body?.subcategoryId) {
      throw new BadRequestException('subcategoryId is required');
    }

    return this.taxonomy.moveChannel(id, body.subcategoryId, this.actor(req));
  }
}
