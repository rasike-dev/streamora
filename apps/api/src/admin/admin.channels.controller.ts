import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtGuard } from '../auth/jwt.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller()
export class AdminChannelsController {
  constructor(private prisma: PrismaService) {}

  @Post('admin/channels')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('ADMIN')
  async create(
    @Body()
    body: {
      name: string;
      slug: string;
      sortOrder?: number;
      translations?: { locale: string; name: string; description?: string }[];
    }
  ) {
    const channel = await this.prisma.channel.create({
      data: {
        name: body.name,
        slug: body.slug,
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
      isActive?: boolean;
      sortOrder?: number;
      translations?: { locale: string; name: string; description?: string }[];
    }
  ) {
    const channel = await this.prisma.channel.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
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

    return channel;
  }
}
