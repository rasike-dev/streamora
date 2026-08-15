import { BadRequestException } from '@nestjs/common';
import { MediaService } from './media.service';
import { ContentTaxonomyService } from '../taxonomy/content-taxonomy.service';
import { TagsService } from '../tags/tags.service';
import { PrismaService } from '../prisma/prisma.service';

const EXTERNAL_ID = 'clerk-user-1';

const CHANNELS = [
  { id: 'ch-a', slug: 'photos', isActive: true },
  { id: 'ch-b', slug: 'posters', isActive: true },
  { id: 'ch-gone', slug: 'archived', isActive: false },
];

/**
 * Media items must obey the same taxonomy rules as videos, otherwise governance
 * would only be half-enforced. These tests mirror videos.service.spec.
 */
function makeService(status = 'READY') {
  const item = {
    id: 'media-1',
    uploaderId: 'user-1',
    status,
    primaryChannelId: 'ch-a',
  };

  const writes = { channels: [] as any[], tags: [] as any[] };

  const tx = {
    mediaItemTranslation: { upsert: jest.fn(async () => ({})) },
    mediaItemChannel: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async ({ data }: any) => {
        writes.channels.push(...data);
        return { count: data.length };
      }),
    },
    mediaItemTag: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async ({ data }: any) => {
        writes.tags.push(...data);
        return { count: data.length };
      }),
    },
    mediaItem: {
      update: jest.fn(async ({ data }: any) => {
        Object.assign(item, data);
        return item;
      }),
      findUnique: jest.fn(async () => item),
    },
  };

  const prisma = {
    user: { findUnique: jest.fn(async () => ({ id: 'user-1' })) },
    mediaItem: {
      findFirst: jest.fn(async () => item),
      findUnique: jest.fn(async () => item),
    },
    channel: {
      findMany: jest.fn(async ({ where }: any) =>
        CHANNELS.filter((c) => where.id.in.includes(c.id)),
      ),
    },
    tag: {
      findMany: jest.fn(async ({ where }: any) =>
        where.id.in.includes('tag-ok')
          ? [
              {
                id: 'tag-ok',
                slug: 'ok',
                name: 'Ok',
                normalizedName: 'ok',
                status: 'ACTIVE',
              },
            ]
          : [],
      ),
      findUnique: jest.fn(async () => null),
      findFirst: jest.fn(async () => null),
      count: jest.fn(async () => 0),
      create: jest.fn(async ({ data }: any) => ({ id: 'tag-new', ...data })),
    },
    tagAlias: { findUnique: jest.fn(async () => null) },
    creatorProfile: {
      findUnique: jest.fn(async () => ({ approval: 'APPROVED' })),
    },
    $transaction: jest.fn(async (fn: any) => fn(tx)),
  } as unknown as PrismaService;

  const service = new MediaService(
    prisma,
    new ContentTaxonomyService(prisma),
    new TagsService(prisma),
  );

  return { service, item, writes };
}

describe('MediaService taxonomy parity (AC-08)', () => {
  it('keeps the requested primary channel', async () => {
    const { service, item } = makeService();

    await service.updateDraft('media-1', EXTERNAL_ID, {
      channelIds: ['ch-a', 'ch-b'],
      primaryChannelId: 'ch-b',
    });

    expect(item.primaryChannelId).toBe('ch-b');
  });

  it('defaults the primary to the first assigned channel', async () => {
    const { service, item } = makeService();

    await service.updateDraft('media-1', EXTERNAL_ID, {
      channelIds: ['ch-b', 'ch-a'],
    });

    expect(item.primaryChannelId).toBe('ch-b');
  });

  it('clears the primary when channels are emptied', async () => {
    const { service, item } = makeService();

    await service.updateDraft('media-1', EXTERNAL_ID, { channelIds: [] });

    expect(item.primaryChannelId).toBeNull();
  });

  it('rejects an archived channel', async () => {
    const { service, writes } = makeService();

    await expect(
      service.updateDraft('media-1', EXTERNAL_ID, { channelIds: ['ch-gone'] }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(writes.channels).toHaveLength(0);
  });

  it('rejects a primary outside the assigned channels', async () => {
    const { service } = makeService();

    await expect(
      service.updateDraft('media-1', EXTERNAL_ID, {
        channelIds: ['ch-a'],
        primaryChannelId: 'ch-b',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('MediaService tag governance parity (AC-05, AC-06)', () => {
  it('resolves existing ids and creates new names through the governed service', async () => {
    const { service, writes } = makeService();

    await service.updateDraft('media-1', EXTERNAL_ID, {
      tagIds: ['tag-ok'],
      newTags: ['Poster Art'],
    });

    expect(writes.tags.map((row) => row.tagId)).toEqual(['tag-ok', 'tag-new']);
  });

  it('rejects an unknown tag id', async () => {
    const { service } = makeService();

    await expect(
      service.updateDraft('media-1', EXTERNAL_ID, { tagIds: ['tag-ghost'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
