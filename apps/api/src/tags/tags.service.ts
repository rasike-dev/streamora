import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TagsService {
  constructor(private prisma: PrismaService) {}

  async findAll(locale: string = 'en') {
    const tags = await this.prisma.tag.findMany({
      orderBy: [{ preferred: 'desc' }, { name: 'asc' }],
      include: {
        translations: {
          where: { locale },
        },
      },
    });

    return tags.map((tag) => {
      const translation = tag.translations[0];
      return {
        id: tag.id,
        slug: tag.slug,
        name: translation?.name || tag.name,
        preferred: tag.preferred,
      };
    });
  }
}
