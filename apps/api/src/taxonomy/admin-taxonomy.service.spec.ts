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
      findFirst: jest.fn(
        async ({ where }: any) =>
          categories.find(
            (c) => c.slug === where.slug && c.id !== where.id?.not,
          ) ?? null,
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const found = categories.find((c) => c.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
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
      findFirst: jest.fn(
        async ({ where }: any) =>
          subcategories.find(
            (s) =>
              s.slug === where.slug &&
              s.categoryId === where.categoryId &&
              s.id !== where.id?.not,
          ) ?? null,
      ),
      findMany: jest.fn(async ({ where }: any) =>
        subcategories.filter(
          (s) =>
            where.id.in.includes(s.id) &&
            (!where.categoryId || s.categoryId === where.categoryId),
        ),
      ),
      update: jest.fn(async ({ where, data }: any) => {
        const found = subcategories.find((s) => s.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
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
