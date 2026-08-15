import { BadRequestException } from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreatorVideosQueryService } from './creator-videos-query.service';
import { ContentTaxonomyService } from '../taxonomy/content-taxonomy.service';
import { TagsService } from '../tags/tags.service';
import { PrismaService } from '../prisma/prisma.service';

const EXTERNAL_ID = 'clerk-user-1';

const CHANNELS = [
  { id: 'ch-speeches', slug: 'speeches', isActive: true },
  { id: 'ch-rallies', slug: 'rallies', isActive: true },
];

/**
 * Covers the creator write path end to end with stubbed persistence: what matters
 * here is which channel/tag rows the service decides to write and how it keeps
 * the primary-channel pointer consistent.
 */
function makeService(videoStatus = 'READY') {
  const video = {
    id: 'video-1',
    uploaderId: 'user-1',
    status: videoStatus,
    primaryChannelId: 'ch-speeches',
  };

  const writes = {
    videoChannels: [] as any[],
    videoTags: [] as any[],
    videoUpdates: [] as any[],
  };

  const tx = {
    videoTranslation: { upsert: jest.fn(async () => ({})) },
    videoChannel: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async ({ data }: any) => {
        writes.videoChannels.push(...data);
        return { count: data.length };
      }),
    },
    videoTag: {
      deleteMany: jest.fn(async () => ({ count: 0 })),
      createMany: jest.fn(async ({ data }: any) => {
        writes.videoTags.push(...data);
        return { count: data.length };
      }),
    },
    video: {
      update: jest.fn(async ({ data }: any) => {
        writes.videoUpdates.push(data);
        Object.assign(video, data);
        return video;
      }),
    },
  };

  const prisma = {
    user: {
      findUnique: jest.fn(async () => ({
        id: 'user-1',
        externalId: EXTERNAL_ID,
      })),
    },
    video: {
      findFirst: jest.fn(async () => video),
      findUnique: jest.fn(async () => video),
      update: tx.video.update,
    },
    channel: {
      findMany: jest.fn(async ({ where }: any) =>
        CHANNELS.filter((c) => where.slug.in.includes(c.slug)),
      ),
      findUnique: jest.fn(async ({ where }: any) => {
        const found = CHANNELS.find((c) => c.slug === where.slug);
        return found ? { id: found.id } : null;
      }),
    },
    tag: {
      findUnique: jest.fn(async ({ where }: any) =>
        where.slug === 'demo'
          ? {
              id: 'tag-demo',
              slug: 'demo',
              name: 'Demo',
              normalizedName: 'demo',
              status: 'ACTIVE',
            }
          : null,
      ),
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

  const service = new VideosService(
    prisma,
    // Listing queries are irrelevant to the write path under test.
    {} as CreatorVideosQueryService,
    new ContentTaxonomyService(prisma),
    new TagsService(prisma),
  );

  return { service, video, writes, prisma };
}

describe('VideosService.updateDraftFull channels (AC-08)', () => {
  it('writes the selected channels and keeps the requested primary', async () => {
    const { service, video, writes } = makeService();

    await service.updateDraftFull('video-1', EXTERNAL_ID, {
      channels: ['speeches', 'rallies'],
      primaryChannel: 'rallies',
    });

    expect(writes.videoChannels.map((row) => row.channelId)).toEqual([
      'ch-speeches',
      'ch-rallies',
    ]);
    expect(video.primaryChannelId).toBe('ch-rallies');
  });

  it('defaults the primary to the first selected channel', async () => {
    const { service, video } = makeService();

    await service.updateDraftFull('video-1', EXTERNAL_ID, {
      channels: ['rallies', 'speeches'],
    });

    expect(video.primaryChannelId).toBe('ch-rallies');
  });

  it('clears the primary when all channels are removed', async () => {
    const { service, video } = makeService();

    await service.updateDraftFull('video-1', EXTERNAL_ID, { channels: [] });

    expect(video.primaryChannelId).toBeNull();
  });

  it('rejects an unknown channel slug instead of dropping it silently', async () => {
    const { service, writes } = makeService();

    await expect(
      service.updateDraftFull('video-1', EXTERNAL_ID, {
        channels: ['speeches', 'ghost'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(writes.videoChannels).toHaveLength(0);
  });

  it('rejects a primary that is not among the selected channels', async () => {
    const { service } = makeService();

    await expect(
      service.updateDraftFull('video-1', EXTERNAL_ID, {
        channels: ['speeches'],
        primaryChannel: 'rallies',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('leaves channels untouched when the field is omitted', async () => {
    const { service, video, writes } = makeService();

    await service.updateDraftFull('video-1', EXTERNAL_ID, {
      translations: [{ locale: 'en', title: 'Only a title change' }],
    });

    expect(writes.videoChannels).toHaveLength(0);
    expect(video.primaryChannelId).toBe('ch-speeches');
  });
});

describe('VideosService.updateDraftFull tags (AC-05)', () => {
  it('attaches existing tags and creates new ones, attributing the assignment', async () => {
    const { service, writes } = makeService();

    await service.updateDraftFull('video-1', EXTERNAL_ID, {
      tags: ['demo'],
      newTags: ['Grassroots'],
    });

    expect(writes.videoTags).toEqual([
      { videoId: 'video-1', tagId: 'tag-demo', addedById: 'user-1' },
      { videoId: 'video-1', tagId: 'tag-new', addedById: 'user-1' },
    ]);
  });

  it('rejects an unknown tag slug', async () => {
    const { service } = makeService();

    await expect(
      service.updateDraftFull('video-1', EXTERNAL_ID, { tags: ['ghost'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('VideosService.updateDraftFull status gate (AC-11)', () => {
  it('refuses edits once the video has left the editable states', async () => {
    const { service } = makeService('PUBLISHED');

    await expect(
      service.updateDraftFull('video-1', EXTERNAL_ID, {
        channels: ['speeches'],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
