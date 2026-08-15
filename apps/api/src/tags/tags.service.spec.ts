import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TagsService } from './tags.service';
import { PrismaService } from '../prisma/prisma.service';
import { MAX_TAGS_PER_ITEM } from '../common/taxonomy/normalize.util';

type TagRow = {
  id: string;
  name: string;
  slug: string;
  normalizedName: string | null;
  status: string;
  mergedIntoTagId?: string | null;
  createdById?: string | null;
};

type AliasRow = { normalizedAlias: string; tagId: string };

/**
 * Small in-memory stand-in for the tag tables. Enough to exercise canonical
 * matching, alias following and the create path without a database.
 */
function makeStore(tags: TagRow[] = [], aliases: AliasRow[] = []) {
  const store = { tags: [...tags], aliases: [...aliases], created: 0 };

  const prisma = {
    tag: {
      findFirst: jest.fn(
        async ({ where }: any) =>
          store.tags.find((t) => t.normalizedName === where.normalizedName) ??
          null,
      ),
      findUnique: jest.fn(
        async ({ where }: any) =>
          store.tags.find((t) =>
            where.id ? t.id === where.id : t.slug === where.slug,
          ) ?? null,
      ),
      count: jest.fn(
        async ({ where }: any) =>
          store.tags.filter((t) => t.slug === where.slug).length,
      ),
      create: jest.fn(async ({ data }: any) => {
        if (store.tags.some((t) => t.normalizedName === data.normalizedName)) {
          throw new Prisma.PrismaClientKnownRequestError('unique', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }

        const row: TagRow = { id: `created-${++store.created}`, ...data };
        store.tags.push(row);
        return row;
      }),
      findMany: jest.fn(async () =>
        store.tags.map((t) => ({ ...t, translations: [] })),
      ),
    },
    tagAlias: {
      findUnique: jest.fn(async ({ where }: any) => {
        const alias = store.aliases.find(
          (a) => a.normalizedAlias === where.normalizedAlias,
        );
        if (!alias) return null;

        return {
          ...alias,
          tag: store.tags.find((t) => t.id === alias.tagId)!,
        };
      }),
    },
    creatorProfile: {
      findUnique: jest.fn(async () => ({ approval: 'APPROVED' })),
    },
  } as unknown as PrismaService;

  return { prisma, store };
}

describe('TagsService.findOrCreate (AC-05, AC-06)', () => {
  it('creates a tag with canonical name, slug and key', async () => {
    const { prisma, store } = makeStore();
    const service = new TagsService(prisma);

    const tag = await service.findOrCreate('  #Party Events ');

    expect(tag.name).toBe('Party Events');
    expect(tag.slug).toBe('party-events');
    expect(tag.normalizedName).toBe('party events');
    expect(store.tags).toHaveLength(1);
  });

  it('reuses the existing tag for an equivalent name instead of duplicating', async () => {
    const { prisma, store } = makeStore([
      {
        id: 'tag-1',
        name: 'Anura Kumara',
        slug: 'anura-kumara',
        normalizedName: 'anura kumara',
        status: 'ACTIVE',
      },
    ]);
    const service = new TagsService(prisma);

    const tag = await service.findOrCreate('#ANURA   kumara');

    expect(tag.id).toBe('tag-1');
    expect(store.tags).toHaveLength(1);
  });

  it('resolves through an alias so a merged name keeps working', async () => {
    const { prisma } = makeStore(
      [
        {
          id: 'tag-target',
          name: 'Elections',
          slug: 'elections',
          normalizedName: 'elections',
          status: 'ACTIVE',
        },
      ],
      [{ normalizedAlias: 'election', tagId: 'tag-target' }],
    );
    const service = new TagsService(prisma);

    await expect(service.findOrCreate('Election')).resolves.toMatchObject({
      id: 'tag-target',
    });
  });

  it('follows a merge pointer to the surviving tag', async () => {
    const { prisma } = makeStore([
      {
        id: 'tag-old',
        name: 'Rally',
        slug: 'rally',
        normalizedName: 'rally',
        status: 'MERGED',
        mergedIntoTagId: 'tag-new',
      },
      {
        id: 'tag-new',
        name: 'Rallies',
        slug: 'rallies',
        normalizedName: 'rallies',
        status: 'ACTIVE',
      },
    ]);
    const service = new TagsService(prisma);

    await expect(service.findOrCreate('rally')).resolves.toMatchObject({
      id: 'tag-new',
    });
  });

  it('rejects a blocked tag', async () => {
    const { prisma } = makeStore([
      {
        id: 'tag-bad',
        name: 'Spam',
        slug: 'spam',
        normalizedName: 'spam',
        status: 'BLOCKED',
      },
    ]);
    const service = new TagsService(prisma);

    await expect(service.findOrCreate('spam')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('rejects an invalid name before touching the database', async () => {
    const { prisma, store } = makeStore();
    const service = new TagsService(prisma);

    await expect(service.findOrCreate('   ')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(store.tags).toHaveLength(0);
  });

  it('re-reads the winner when a concurrent create takes the canonical key', async () => {
    const { prisma, store } = makeStore();
    const service = new TagsService(prisma);

    // Simulate the other request committing between our lookup and our insert.
    (prisma.tag.create as jest.Mock).mockImplementationOnce(async () => {
      store.tags.push({
        id: 'tag-winner',
        name: 'Debate',
        slug: 'debate',
        normalizedName: 'debate',
        status: 'ACTIVE',
      });

      throw new Prisma.PrismaClientKnownRequestError('unique', {
        code: 'P2002',
        clientVersion: 'test',
      });
    });

    const tag = await service.findOrCreate('Debate');

    expect(tag.id).toBe('tag-winner');
    expect(store.tags).toHaveLength(1);
  });

  it('gives a new tag from an unapproved uploader PENDING status', async () => {
    const { prisma } = makeStore();
    (prisma.creatorProfile.findUnique as jest.Mock).mockResolvedValue({
      approval: 'PENDING',
    });
    const service = new TagsService(prisma);

    const [id] = await service.resolveTagIds({
      newTags: ['Grassroots'],
      actorUserId: 'user-1',
    });

    expect(id).toBeTruthy();
    expect((prisma.tag.create as jest.Mock).mock.calls[0][0].data.status).toBe(
      'PENDING',
    );
  });
});

describe('TagsService.resolveTagIds (AC-05)', () => {
  it('combines picked slugs with newly typed names, without duplicates', async () => {
    const { prisma } = makeStore([
      {
        id: 'tag-1',
        name: 'Speeches',
        slug: 'speeches',
        normalizedName: 'speeches',
        status: 'ACTIVE',
      },
    ]);
    const service = new TagsService(prisma);

    const ids = await service.resolveTagIds({
      slugs: ['speeches'],
      newTags: ['Speeches', 'Youth'],
    });

    expect(ids).toHaveLength(2);
    expect(ids[0]).toBe('tag-1');
  });

  it('rejects an unknown slug', async () => {
    const { prisma } = makeStore();
    const service = new TagsService(prisma);

    await expect(
      service.resolveTagIds({ slugs: ['ghost'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('caps the number of tags per item', async () => {
    const tags: TagRow[] = Array.from(
      { length: MAX_TAGS_PER_ITEM + 1 },
      (_, i) => ({
        id: `tag-${i}`,
        name: `Tag ${i}`,
        slug: `tag-${i}`,
        normalizedName: `tag ${i}`,
        status: 'ACTIVE',
      }),
    );
    const { prisma } = makeStore(tags);
    const service = new TagsService(prisma);

    await expect(
      service.resolveTagIds({ slugs: tags.map((t) => t.slug) }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
