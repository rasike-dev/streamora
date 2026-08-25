import { TaxonomyService } from './taxonomy.service';
import { PrismaService } from '../prisma/prisma.service';

function serviceWithChannel(channel: any) {
  const prisma = {
    channel: { findUnique: jest.fn(async () => channel) },
  } as unknown as PrismaService;

  return new TaxonomyService(prisma);
}

describe('TaxonomyService.localize', () => {
  const service = serviceWithChannel(null);

  it('prefers the requested locale', () => {
    expect(
      service.localize(
        [
          { locale: 'en', name: 'Speeches' },
          { locale: 'si', name: 'කථා' },
        ],
        'si',
        'Speeches',
      ),
    ).toBe('කථා');
  });

  it('falls back to English, then to the base column', () => {
    expect(
      service.localize([{ locale: 'en', name: 'Speeches' }], 'ta', 'Base'),
    ).toBe('Speeches');

    expect(service.localize([], 'ta', 'Base')).toBe('Base');
    expect(service.localize(undefined, 'ta', 'Base')).toBe('Base');
  });
});

describe('TaxonomyService.getPublicTree (AC-09)', () => {
  const tree = [
    {
      id: 'cat-1',
      slug: 'election-campaigns',
      name: 'Election Campaigns',
      description: 'Campaign content',
      displayOrder: 1,
      translations: [{ locale: 'si', name: 'මැතිවරණ', description: 'desc-si' }],
      subcategories: [
        {
          id: 'sub-1',
          slug: 'presidential-elections',
          name: 'Presidential Elections',
          description: null,
          displayOrder: 1,
          translations: [{ locale: 'si', name: 'ජනාධිපති', description: null }],
          channels: [
            {
              id: 'ch-1',
              slug: 'rallies',
              name: 'Rallies',
              translations: [{ locale: 'si', name: 'රැලි' }],
            },
          ],
        },
      ],
    },
  ];

  it('returns a localized category > subcategory > channel tree', async () => {
    const prisma = {
      category: { findMany: jest.fn(async () => tree) },
    } as unknown as PrismaService;
    const service = new TaxonomyService(prisma);

    const result = await service.getPublicTree('si');

    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      }),
    );
    expect(result).toEqual([
      {
        id: 'cat-1',
        slug: 'election-campaigns',
        name: 'මැතිවරණ',
        description: 'desc-si',
        displayOrder: 1,
        subcategories: [
          {
            id: 'sub-1',
            slug: 'presidential-elections',
            name: 'ජනාධිපති',
            description: null,
            displayOrder: 1,
            channels: [{ id: 'ch-1', slug: 'rallies', name: 'රැලි' }],
          },
        ],
      },
    ]);
  });
});

describe('TaxonomyService.getCategoryBySlug (AC-09)', () => {
  it('returns subcategories with aggregated video counts', async () => {
    const prisma = {
      category: {
        findFirst: jest.fn(async () => ({
          id: 'cat-1',
          slug: 'election-campaigns',
          name: 'Election Campaigns',
          description: null,
          translations: [],
          subcategories: [
            {
              id: 'sub-1',
              slug: 'presidential-elections',
              name: 'Presidential Elections',
              description: null,
              translations: [],
              channels: [
                {
                  id: 'ch-1',
                  slug: 'rallies',
                  name: 'Rallies',
                  translations: [],
                },
                {
                  id: 'ch-2',
                  slug: 'debates',
                  name: 'Debates',
                  translations: [],
                },
              ],
            },
          ],
        })),
      },
      videoChannel: {
        groupBy: jest.fn(async () => [
          { channelId: 'ch-1', _count: { videoId: 3 } },
          { channelId: 'ch-2', _count: { videoId: 1 } },
        ]),
      },
    } as unknown as PrismaService;
    const service = new TaxonomyService(prisma);

    const result = await service.getCategoryBySlug('election-campaigns', 'en');

    expect(result.subcategories[0].videoCount).toBe(4);
    expect(result.subcategories[0].channels).toEqual([
      { id: 'ch-1', slug: 'rallies', name: 'Rallies', videoCount: 3 },
      { id: 'ch-2', slug: 'debates', name: 'Debates', videoCount: 1 },
    ]);
  });

  it('throws when the category slug is unknown', async () => {
    const prisma = {
      category: { findFirst: jest.fn(async () => null) },
    } as unknown as PrismaService;
    const service = new TaxonomyService(prisma);

    await expect(service.getCategoryBySlug('missing', 'en')).rejects.toThrow(
      'Category not found',
    );
  });
});

describe('TaxonomyService.getSubcategoryBySlug (AC-09)', () => {
  it('scopes lookup to the parent category slug', async () => {
    const prisma = {
      subcategory: {
        findFirst: jest.fn(async () => ({
          id: 'sub-1',
          slug: 'presidential-elections',
          name: 'Presidential Elections',
          description: null,
          translations: [],
          category: {
            slug: 'election-campaigns',
            name: 'Election Campaigns',
            translations: [],
          },
          channels: [
            { id: 'ch-1', slug: 'rallies', name: 'Rallies', translations: [] },
          ],
        })),
      },
      videoChannel: {
        groupBy: jest.fn(async () => [
          { channelId: 'ch-1', _count: { videoId: 2 } },
        ]),
      },
    } as unknown as PrismaService;
    const service = new TaxonomyService(prisma);

    const result = await service.getSubcategoryBySlug(
      'election-campaigns',
      'presidential-elections',
      'en',
    );

    expect(prisma.subcategory.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: 'presidential-elections',
          isActive: true,
          category: { slug: 'election-campaigns', isActive: true },
        },
      }),
    );
    expect(result.category.slug).toBe('election-campaigns');
    expect(result.channels[0].videoCount).toBe(2);
  });

  it('throws when the subcategory is not under the category', async () => {
    const prisma = {
      subcategory: { findFirst: jest.fn(async () => null) },
    } as unknown as PrismaService;
    const service = new TaxonomyService(prisma);

    await expect(
      service.getSubcategoryBySlug('wrong', 'presidential-elections', 'en'),
    ).rejects.toThrow('Subcategory not found');
  });
});

describe('TaxonomyService.getChannelBreadcrumb (AC-08)', () => {
  it('returns the localized Category > Subcategory > Channel trail', async () => {
    const service = serviceWithChannel({
      slug: 'rallies',
      name: 'Rallies',
      translations: [{ locale: 'si', name: 'රැලි' }],
      subcategory: {
        slug: 'public-meetings',
        name: 'Public Meetings',
        translations: [{ locale: 'si', name: 'ප්‍රසිද්ධ රැස්වීම්' }],
        category: {
          slug: 'leadership-speeches',
          name: 'Leadership & Speeches',
          translations: [{ locale: 'si', name: 'නායකත්වය' }],
        },
      },
    });

    const breadcrumb = await service.getChannelBreadcrumb('ch-1', 'si');

    expect(breadcrumb).toEqual({
      category: { slug: 'leadership-speeches', name: 'නායකත්වය' },
      subcategory: { slug: 'public-meetings', name: 'ප්‍රසිද්ධ රැස්වීම්' },
      channel: { slug: 'rallies', name: 'රැලි' },
    });
  });

  it('still renders an unmapped channel, with null ancestors', async () => {
    const service = serviceWithChannel({
      slug: 'legacy',
      name: 'Legacy',
      translations: [],
      subcategory: null,
    });

    const breadcrumb = await service.getChannelBreadcrumb('ch-legacy', 'en');

    expect(breadcrumb).toEqual({
      category: null,
      subcategory: null,
      channel: { slug: 'legacy', name: 'Legacy' },
    });
  });

  it('returns null for a channel that no longer exists', async () => {
    const service = serviceWithChannel(null);

    await expect(
      service.getChannelBreadcrumb('gone', 'en'),
    ).resolves.toBeNull();
  });
});
