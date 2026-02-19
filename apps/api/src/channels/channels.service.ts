import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChannelsService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string = 'en') {
    const channels = await this.prisma.channel.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    return channels.map((channel) => {
      const translation = channel.translations[0];
      return {
        id: channel.id,
        slug: channel.slug,
        name: translation?.name || channel.name,
        description: translation?.description || null,
        sortOrder: channel.sortOrder,
      };
    });
  }
}
