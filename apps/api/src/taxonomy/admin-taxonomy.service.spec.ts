import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminTaxonomyService } from './admin-taxonomy.service';
import { TaxonomyService } from './taxonomy.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTOR = 'admin-1';

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
};
type SubcategoryRow = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  isActive: boolean;
};
type ChannelRow = {
  id: string;
  name: string;
  slug: string;
  subcategoryId: string | null;
};

function makeStub(seed: {
  categories?: CategoryRow[];
  subcategories?: SubcategoryRow[];
  channels?: ChannelRow[];
}) {
  const categories = seed.categories ?? [];
  const subcategories = seed.subcategories ?? [];
  const channels = seed.channels ?? [];
  const audits: any[] = [];

  const withChildren = (category: CategoryRow) => ({
    ...category,
    subcategories: subcategories
      .filter((s) => s.categoryId === category.id)
      .map((s) => ({
        ...s,
        channels: channels
          .filter((c) => c.subcategoryId === s.id)
          .map((c) => ({ id: c.id, isActive: true })),
      })),
  });

  const prisma = {
    category: {
      findUnique: jest.fn(async ({ where }: any) => {
        const found = categories.find((c) => c.id === where.id);
        return found ? withChildren(found) : null;
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        if (orderBy?.displayOrder === 'desc') {
          const sorted = [...categories].sort(
            (a, b) => (b as any).displayOrder - (a as any).displayOrder,
          );
          return sorted[0] ?? null;
        }

        return (
          categories.find(
            (c) => c.slug === where.slug && c.id !== where.id?.not,
          ) ?? null
        );
      }),
      findMany: jest.fn(async ({ where }: any) =>
        categories.filter((c) => !where?.id?.in || where.id.in.includes(c.id)),
      ),
      count: jest.fn(
        async ({ where }: any) =>
          categories.filter((c) => !where?.slug || c.slug === where.slug)
            .length,
      ),
      create: jest.fn(async ({ data, include }: any) => {
        const created = {
          id: `cat-${categories.length + 1}`,
          slug: data.slug,
          name: data.name,
          description: data.description ?? null,
          displayOrder: data.displayOrder ?? 1,
          isActive: true,
          translations: include?.translations
            ? (data.translations?.create ?? []).map((t: any, i: number) => ({
                id: `ctr-${i}`,
                ...t,
              }))
            : [],
        } as CategoryRow & {
          description?: string | null;
          displayOrder?: number;
        };
        categories.push(created);
        return created;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const found = categories.find((c) => c.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
    },
    categoryTranslation: {
      upsert: jest.fn(async ({ create }: any) => create),
    },
    subcategory: {
      findUnique: jest.fn(async ({ where }: any) => {
        const found = subcategories.find((s) => s.id === where.id);
        if (!found) return null;

        return {
          ...found,
          category: categories.find((c) => c.id === found.categoryId),
          channels: channels
            .filter((c) => c.subcategoryId === found.id)
            .map((c) => ({ id: c.id, isActive: true })),
        };
      }),
      findFirst: jest.fn(async ({ where, orderBy }: any) => {
        if (orderBy?.displayOrder === 'desc') {
          const scoped = subcategories.filter(
            (s) => !where?.categoryId || s.categoryId === where.categoryId,
          );
          const sorted = [...scoped].sort(
            (a, b) => (b as any).displayOrder - (a as any).displayOrder,
          );
          return sorted[0] ?? null;
        }

        return (
          subcategories.find(
            (s) =>
              s.slug === where.slug &&
              s.categoryId === where.categoryId &&
              s.id !== where.id?.not,
          ) ?? null
        );
      }),
      findMany: jest.fn(async ({ where }: any) =>
        subcategories.filter(
          (s) =>
            where.id.in.includes(s.id) &&
            (!where.categoryId || s.categoryId === where.categoryId),
        ),
      ),
      count: jest.fn(
        async ({ where }: any) =>
          subcategories.filter(
            (s) =>
              s.categoryId === where.categoryId &&
              (!where.slug || s.slug === where.slug),
          ).length,
      ),
      create: jest.fn(async ({ data, include }: any) => {
        const created = {
          id: `sub-${subcategories.length + 1}`,
          categoryId: data.categoryId,
          slug: data.slug,
          name: data.name,
          isActive: true,
          translations: include?.translations
            ? (data.translations?.create ?? []).map((t: any, i: number) => ({
                id: `str-${i}`,
                ...t,
              }))
            : [],
        } as SubcategoryRow;
        subcategories.push(created);
        return created;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const found = subcategories.find((s) => s.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
    },
    subcategoryTranslation: {
      upsert: jest.fn(async ({ create }: any) => create),
    },
    channel: {
      findUnique: jest.fn(
        async ({ where }: any) =>
          channels.find((c) => c.id === where.id) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const found = channels.find((c) => c.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
    },
    videoChannel: { count: jest.fn(async () => 3) },
    mediaItemChannel: { count: jest.fn(async () => 1) },
    taxonomyAuditLog: {
      create: jest.fn(async ({ data }: any) => {
        audits.push(data);
        return data;
      }),
    },
    $transaction: jest.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;

  return { prisma, audits, categories, subcategories, channels };
}

describe('AdminTaxonomyService read helpers (AC-01)', () => {
  it('getAdminTree returns localized names for the admin UI', async () => {
    const prisma = {
      category: {
        findMany: jest.fn(async () => [
          {
            id: 'cat-1',
            slug: 'politics',
            name: 'Politics',
            description: null,
            displayOrder: 1,
            isActive: true,
            translations: [
              { locale: 'si', name: 'දේශපාලන', description: null },
            ],
            subcategories: [],
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    const tree = await service.getAdminTree('si');

    expect(tree).toEqual([
      expect.objectContaining({
        slug: 'politics',
        localizedName: 'දේශපාලන',
        subcategories: [],
      }),
    ]);
  });

  it('getUnmappedChannels surfaces legacy channels without a subcategory', async () => {
    const prisma = {
      channel: {
        findMany: jest.fn(async () => [
          {
            id: 'ch-legacy',
            slug: 'technology',
            name: 'Technology',
            isActive: true,
            sortOrder: 1,
            translations: [{ locale: 'en', name: 'Technology' }],
            _count: { videos: 5, mediaItems: 1 },
          },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    const unmapped = await service.getUnmappedChannels('en');

    expect(unmapped).toEqual([
      expect.objectContaining({
        slug: 'technology',
        localizedName: 'Technology',
        videoCount: 5,
        mediaItemCount: 1,
      }),
    ]);
  });
});

describe('AdminTaxonomyService.getImpact (AC-04)', () => {
  it('reports category content counts and archive blockers', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
        {
          id: 'sub-2',
          categoryId: 'cat-1',
          name: 'Retired',
          slug: 'retired',
          isActive: false,
        },
      ],
      channels: [
        {
          id: 'ch-1',
          name: 'Rallies',
          slug: 'rallies',
          subcategoryId: 'sub-1',
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    const impact = await service.getImpact('CATEGORY', 'cat-1');

    expect(impact).toEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        entityId: 'cat-1',
        name: 'Politics',
        subcategories: 2,
        channels: 1,
        videos: 3,
        mediaItems: 1,
        blockers: ['1 active subcategory must be archived or moved first'],
      }),
    );
  });

  it('404s when the impact target does not exist', async () => {
    const { prisma } = makeStub({ categories: [] });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.getImpact('CATEGORY', 'missing'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminTaxonomyService create/update (AC-01, AC-02)', () => {
  it('creates a category with a generated slug and audit row', async () => {
    const { prisma, audits, categories } = makeStub({ categories: [] });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    const created = await service.createCategory(
      {
        name: 'Community Engagement',
        translations: [{ locale: 'si', name: 'ප්‍රජා' }],
      },
      ACTOR,
    );

    expect(created.slug).toBe('community-engagement');
    expect(categories).toHaveLength(1);
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        action: 'TAXONOMY_CREATED',
        actorUserId: ACTOR,
      }),
    );
  });

  it('updates a category and upserts translations', async () => {
    const { prisma, audits, categories } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await service.updateCategory(
      'cat-1',
      {
        name: 'Politics Updated',
        translations: [{ locale: 'en', name: 'Politics Updated' }],
      },
      ACTOR,
    );

    expect(categories[0].name).toBe('Politics Updated');
    expect(prisma.categoryTranslation.upsert).toHaveBeenCalled();
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        action: 'TAXONOMY_UPDATED',
      }),
    );
  });

  it('rejects a category slug that already exists', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
        { id: 'cat-2', name: 'Media', slug: 'media', isActive: true },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.updateCategory('cat-1', { slug: 'media' }, ACTOR),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a subcategory under an existing category', async () => {
    const { prisma, audits, subcategories } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    const created = await service.createSubcategory(
      { categoryId: 'cat-1', name: 'Town Halls' },
      ACTOR,
    );

    expect(created.slug).toBe('town-halls');
    expect(subcategories).toHaveLength(1);
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'SUBCATEGORY',
        action: 'TAXONOMY_CREATED',
      }),
    );
  });

  it('rejects creating a subcategory under an unknown category', async () => {
    const { prisma } = makeStub({ categories: [] });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.createSubcategory(
        { categoryId: 'missing', name: 'Town Halls' },
        ACTOR,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('restores an archived category and audits the action', async () => {
    const { prisma, audits, categories } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: false },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await service.restoreCategory('cat-1', ACTOR);

    expect(categories[0].isActive).toBe(true);
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        action: 'TAXONOMY_RESTORED',
      }),
    );
  });

  it('rejects a subcategory slug collision within the same category', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
        {
          id: 'sub-2',
          categoryId: 'cat-1',
          name: 'Debates',
          slug: 'debates',
          isActive: true,
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.updateSubcategory('sub-2', { slug: 'speeches' }, ACTOR),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('reorders categories and writes an audit row', async () => {
    const { prisma, audits, categories } = makeStub({
      categories: [
        { id: 'cat-1', name: 'A', slug: 'a', isActive: true },
        { id: 'cat-2', name: 'B', slug: 'b', isActive: true },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await service.reorderCategories(['cat-2', 'cat-1'], ACTOR);

    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        action: 'TAXONOMY_REORDERED',
      }),
    );
    expect(categories).toHaveLength(2);
  });
});

describe('AdminTaxonomyService archive rules (AC-01, AC-02)', () => {
  it('refuses to archive a category that still has active subcategories', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.archiveCategory('cat-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('archives a category once its subcategories are archived, and audits it', async () => {
    const { prisma, audits, categories } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: false,
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await service.archiveCategory('cat-1', ACTOR);

    expect(categories[0].isActive).toBe(false);
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CATEGORY',
        action: 'TAXONOMY_ARCHIVED',
        actorUserId: ACTOR,
      }),
    );
  });

  it('refuses to archive a subcategory that still has active channels', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
      ],
      channels: [
        {
          id: 'ch-1',
          name: 'Rallies',
          slug: 'rallies',
          subcategoryId: 'sub-1',
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.archiveSubcategory('sub-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('will not restore a subcategory under an archived category', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: false },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: false,
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.restoreSubcategory('sub-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AdminTaxonomyService move rules (AC-02, AC-03, AC-12)', () => {
  const seed = () =>
    makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
        { id: 'cat-2', name: 'Media', slug: 'media', isActive: true },
        { id: 'cat-3', name: 'Retired', slug: 'retired', isActive: false },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
        {
          id: 'sub-2',
          categoryId: 'cat-2',
          name: 'Speeches',
          slug: 'speeches',
          isActive: true,
        },
        {
          id: 'sub-3',
          categoryId: 'cat-2',
          name: 'Interviews',
          slug: 'interviews',
          isActive: true,
        },
      ],
      channels: [
        {
          id: 'ch-1',
          name: 'Rallies',
          slug: 'rallies',
          subcategoryId: 'sub-1',
        },
      ],
    });

  it('moves a subcategory and records what was re-classified', async () => {
    const { prisma, audits, subcategories } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    // sub-3 has no slug clash in cat-1.
    await service.moveSubcategory('sub-3', 'cat-1', ACTOR);

    expect(subcategories.find((s) => s.id === 'sub-3')!.categoryId).toBe(
      'cat-1',
    );
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'TAXONOMY_MOVED',
        entityType: 'SUBCATEGORY',
        metadata: expect.objectContaining({
          fromCategoryId: 'cat-2',
          toCategoryId: 'cat-1',
        }),
      }),
    );
  });

  it('rejects a move that would collide with an existing slug', async () => {
    const { prisma } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.moveSubcategory('sub-1', 'cat-2', ACTOR),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a move into an archived category', async () => {
    const { prisma } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.moveSubcategory('sub-1', 'cat-3', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a no-op move', async () => {
    const { prisma } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.moveSubcategory('sub-1', 'cat-1', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves a channel to another subcategory and audits the content impact', async () => {
    const { prisma, audits, channels } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await service.moveChannel('ch-1', 'sub-3', ACTOR);

    expect(channels[0].subcategoryId).toBe('sub-3');
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'CHANNEL',
        action: 'TAXONOMY_MOVED',
        metadata: expect.objectContaining({
          affectedVideos: 3,
          affectedMediaItems: 1,
        }),
      }),
    );
  });

  it('rejects assigning a channel to an unknown subcategory', async () => {
    const { prisma } = seed();
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.moveChannel('ch-1', 'sub-missing', ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AdminTaxonomyService reorder (AC-01, AC-02)', () => {
  it('rejects a reorder list containing subcategories from another category', async () => {
    const { prisma } = makeStub({
      categories: [
        { id: 'cat-1', name: 'Politics', slug: 'politics', isActive: true },
      ],
      subcategories: [
        {
          id: 'sub-1',
          categoryId: 'cat-1',
          name: 'A',
          slug: 'a',
          isActive: true,
        },
        {
          id: 'sub-9',
          categoryId: 'cat-other',
          name: 'B',
          slug: 'b',
          isActive: true,
        },
      ],
    });
    const service = new AdminTaxonomyService(
      prisma,
      new TaxonomyService(prisma),
    );

    await expect(
      service.reorderSubcategories('cat-1', ['sub-1', 'sub-9'], ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
