import {
  Body,
  Controller,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class AdminTagsController {
  constructor(private prisma: PrismaService) {}

  @Post('admin/tags')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body()
    body: {
      name: string;
      slug: string;
      preferred?: boolean;
      translations?: { locale: string; name: string }[];
    },
  ) {
    const tag = await this.prisma.tag.create({
      data: {
        name: body.name,
        slug: body.slug,
        preferred: body.preferred ?? false,
        translations: body.translations
          ? {
              create: body.translations.map((t) => ({
                locale: t.locale,
                name: t.name,
              })),
            }
          : undefined,
      },
      include: { translations: true },
    });

    return tag;
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
  ) {
    const tag = await this.prisma.tag.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        preferred: body.preferred,
      },
    });

    if (body.translations?.length) {
      for (const t of body.translations) {
        await this.prisma.tagTranslation.upsert({
          where: {
            tagId_locale: {
              tagId: id,
              locale: t.locale,
            },
          },
          update: {
            name: t.name,
          },
          create: {
            tagId: id,
            locale: t.locale,
            name: t.name,
          },
        });
      }
    }

    return tag;
  }
}
