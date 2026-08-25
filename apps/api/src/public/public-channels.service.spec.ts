import { NotFoundException } from '@nestjs/common';
import { PublicChannelsService } from './public-channels.service';
import { PrismaService } from '../prisma/prisma.service';
import { TaxonomyService } from '../taxonomy/taxonomy.service';

describe('PublicChannelsService (AC-09, AC-10)', () => {
  it('returns channel detail, breadcrumb and published videos', async () => {
    const prisma = {
      channel: {
        findFirst: jest.fn(async () => ({
          id: 'ch-1',
          slug: 'rallies',
          name: 'Rallies',
          translations: [{ locale: 'si', name: 'රැලි', description: null }],
        })),
      },
      video: {
        count: jest.fn(async () => 1),
        findMany: jest.fn(async () => [
          {
            id: 'v1',
            slug: 'opening-rally',
            publishedAt: new Date('2026-01-01'),
            uploaderVisible: true,
            translations: [
              {
                locale: 'si',
                title: 'ආරම්භක රැලිය',
                description: null,
                tagline: null,
              },
            ],
            thumbnails: [
              { bucket: 'thumbs', objectKey: 'rally.jpg', isSelected: true },
            ],
            uploader: { displayName: 'Campaign Team', username: 'campaign' },
          },
        ]),
      },
    } as unknown as PrismaService;
    const taxonomy = {
      getChannelBreadcrumb: jest.fn(async () => [
        { slug: 'politics', name: 'Politics' },
        { slug: 'speeches', name: 'Speeches' },
        { slug: 'rallies', name: 'Rallies' },
      ]),
    } as unknown as TaxonomyService;
    const service = new PublicChannelsService(prisma, taxonomy);

    const result = await service.getChannelBySlug('rallies', {
      locale: 'si',
      page: 1,
      pageSize: 12,
    });

    expect(result.channel).toEqual(
      expect.objectContaining({ slug: 'rallies', name: 'රැලි' }),
    );
    expect(result.breadcrumb).toHaveLength(3);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: 'opening-rally',
        title: 'ආරම්භක රැලිය',
        thumbnailUrl: 'https://storage.googleapis.com/thumbs/rally.jpg',
        uploaderName: 'Campaign Team',
      }),
    );
    expect(taxonomy.getChannelBreadcrumb).toHaveBeenCalledWith('ch-1', 'si');
  });

  it('404s when the channel slug is unknown or inactive', async () => {
    const prisma = {
      channel: { findFirst: jest.fn(async () => null) },
    } as unknown as PrismaService;
    const taxonomy = {
      getChannelBreadcrumb: jest.fn(),
    } as unknown as TaxonomyService;
    const service = new PublicChannelsService(prisma, taxonomy);

    await expect(
      service.getChannelBySlug('ghost', {
        locale: 'en',
        page: 1,
        pageSize: 12,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
