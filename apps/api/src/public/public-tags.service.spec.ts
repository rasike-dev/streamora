import { NotFoundException } from '@nestjs/common';
import { PublicTagsService } from './public-tags.service';
import { PrismaService } from '../prisma/prisma.service';

type TagRow = {
  id: string;
  name: string;
  slug: string;
  status: string;
  mergedIntoTagId?: string | null;
  description?: string | null;
};

function makeService(
  tags: TagRow[],
  aliases: Array<{ normalizedAlias: string; tagId: string }> = [],
) {
  const prisma = {
    tag: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          tags.find((t) => t.slug === where.slug) ?? null,
      ),
      findUnique: jest.fn(
        async ({ where }: any) => tags.find((t) => t.id === where.id) ?? null,
      ),
      findUniqueOrThrow: jest.fn(async ({ where }: any) => {
        const found = tags.find((t) => t.id === where.id);
        if (!found) throw new Error('not found');
        return { ...found, translations: [] };
      }),
    },
    tagAlias: {
      findUnique: jest.fn(async ({ where }: any) => {
        const alias = aliases.find(
          (a) => a.normalizedAlias === where.normalizedAlias,
        );
        if (!alias) return null;
        return { ...alias, tag: tags.find((t) => t.id === alias.tagId) };
      }),
    },
    video: {
      count: jest.fn(async () => 0),
      findMany: jest.fn(async () => []),
    },
  } as unknown as PrismaService;

  return new PublicTagsService(prisma);
}

const opts = { locale: 'en', page: 1, pageSize: 12 };

describe('PublicTagsService slug resolution (AC-10)', () => {
  it('serves a live tag directly', async () => {
    const service = makeService([
      { id: 'tag-1', name: 'Rallies', slug: 'rallies', status: 'ACTIVE' },
    ]);

    const result = await service.getTagBySlug('rallies', opts);

    expect(result.tag.slug).toBe('rallies');
    expect(result.tag.redirectedFrom).toBeNull();
  });

  it('keeps a merged tag URL working by serving the surviving tag', async () => {
    const service = makeService([
      {
        id: 'tag-old',
        name: 'Rally',
        slug: 'rally',
        status: 'MERGED',
        mergedIntoTagId: 'tag-new',
      },
      { id: 'tag-new', name: 'Rallies', slug: 'rallies', status: 'ACTIVE' },
    ]);

    const result = await service.getTagBySlug('rally', opts);

    expect(result.tag.slug).toBe('rallies');
    expect(result.tag.redirectedFrom).toBe('rally');
  });

  it('resolves an alias slug to its canonical tag', async () => {
    const service = makeService(
      [{ id: 'tag-1', name: 'Elections', slug: 'elections', status: 'ACTIVE' }],
      [{ normalizedAlias: 'general election', tagId: 'tag-1' }],
    );

    const result = await service.getTagBySlug('general-election', opts);

    expect(result.tag.slug).toBe('elections');
    expect(result.tag.redirectedFrom).toBe('general-election');
  });

  it('still 404s for a slug that never existed', async () => {
    const service = makeService([]);

    await expect(service.getTagBySlug('ghost', opts)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
