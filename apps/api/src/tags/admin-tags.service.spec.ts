import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { AdminTagsService } from './admin-tags.service';
import { PrismaService } from '../prisma/prisma.service';

const ACTOR = 'admin-1';

type TagRow = {
  id: string;
  name: string;
  slug: string;
  normalizedName: string | null;
  status: string;
  mergedIntoTagId?: string | null;
  preferred?: boolean;
};

/**
 * In-memory stand-in for the tag tables plus the two join tables, enough to
 * verify that a merge moves assignments, drops duplicates and leaves an alias.
 */
function makeStub(seed: {
  tags: TagRow[];
  videoTags?: Array<{ videoId: string; tagId: string }>;
  mediaTags?: Array<{ mediaItemId: string; tagId: string }>;
}) {
  const tags = seed.tags;
  let videoTags = seed.videoTags ?? [];
  let mediaTags = seed.mediaTags ?? [];
  const aliases: any[] = [];
  const audits: any[] = [];

  const tx = {
    videoTag: {
      findMany: jest.fn(async ({ where }: any) =>
        videoTags.filter((row) => row.tagId === where.tagId),
      ),
      deleteMany: jest.fn(async ({ where }: any) => {
        const before = videoTags.length;
        videoTags = videoTags.filter(
          (row) =>
            !(
              row.tagId === where.tagId &&
              (!where.videoId || where.videoId.in.includes(row.videoId))
            ),
        );
        return { count: before - videoTags.length };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const affected = videoTags.filter((row) => row.tagId === where.tagId);
        affected.forEach((row) => (row.tagId = data.tagId));
        return { count: affected.length };
      }),
    },
    mediaItemTag: {
      findMany: jest.fn(async ({ where }: any) =>
        mediaTags.filter((row) => row.tagId === where.tagId),
      ),
      deleteMany: jest.fn(async ({ where }: any) => {
        const before = mediaTags.length;
        mediaTags = mediaTags.filter(
          (row) =>
            !(
              row.tagId === where.tagId &&
              (!where.mediaItemId ||
                where.mediaItemId.in.includes(row.mediaItemId))
            ),
        );
        return { count: before - mediaTags.length };
      }),
      updateMany: jest.fn(async ({ where, data }: any) => {
        const affected = mediaTags.filter((row) => row.tagId === where.tagId);
        affected.forEach((row) => (row.tagId = data.tagId));
        return { count: affected.length };
      }),
    },
    tagAlias: {
      updateMany: jest.fn(async ({ where, data }: any) => {
        const affected = aliases.filter((a) => a.tagId === where.tagId);
        affected.forEach((a) => (a.tagId = data.tagId));
        return { count: affected.length };
      }),
      findUnique: jest.fn(
        async ({ where }: any) =>
          aliases.find((a) => a.normalizedAlias === where.normalizedAlias) ??
          null,
      ),
      create: jest.fn(async ({ data }: any) => {
        aliases.push({ ...data });
        return data;
      }),
    },
    tag: {
      update: jest.fn(async ({ where, data }: any) => {
        const found = tags.find((t) => t.id === where.id)!;
        Object.assign(found, data);
        return found;
      }),
    },
  };

  const prisma = {
    tag: {
      findUnique: jest.fn(
        async ({ where }: any) => tags.find((t) => t.id === where.id) ?? null,
      ),
      findFirst: jest.fn(
        async ({ where }: any) =>
          tags.find((t) => t.normalizedName === where.normalizedName) ?? null,
      ),
      findMany: jest.fn(async () => []),
      count: jest.fn(async () => 0),
      update: tx.tag.update,
    },
    videoTag: {
      count: jest.fn(
        async ({ where }: any) =>
          videoTags.filter((row) => row.tagId === where.tagId).length,
      ),
      deleteMany: tx.videoTag.deleteMany,
    },
    mediaItemTag: {
      count: jest.fn(
        async ({ where }: any) =>
          mediaTags.filter((row) => row.tagId === where.tagId).length,
      ),
      deleteMany: tx.mediaItemTag.deleteMany,
    },
    tagAuditLog: undefined,
    taxonomyAuditLog: {
      create: jest.fn(async ({ data }: any) => {
        audits.push(data);
        return data;
      }),
    },
    $transaction: jest.fn(async (arg: any) =>
      typeof arg === 'function' ? arg(tx) : Promise.all(arg),
    ),
  } as unknown as PrismaService;

  return {
    prisma,
    audits,
    aliases,
    tags,
    getVideoTags: () => videoTags,
    getMediaTags: () => mediaTags,
  };
}

describe('AdminTagsService.merge (AC-07, AC-12)', () => {
  const seed = () =>
    makeStub({
      tags: [
        {
          id: 'tag-src',
          name: 'Rally',
          slug: 'rally',
          normalizedName: 'rally',
          status: 'ACTIVE',
        },
        {
          id: 'tag-dst',
          name: 'Rallies',
          slug: 'rallies',
          normalizedName: 'rallies',
          status: 'ACTIVE',
        },
      ],
      videoTags: [
        { videoId: 'v1', tagId: 'tag-src' },
        { videoId: 'v2', tagId: 'tag-src' },
        // v2 already carries the target tag: this pair must be de-duplicated.
        { videoId: 'v2', tagId: 'tag-dst' },
      ],
      mediaTags: [{ mediaItemId: 'm1', tagId: 'tag-src' }],
    });

  it('moves assignments, drops duplicates and tombstones the source', async () => {
    const { prisma, tags, getVideoTags, getMediaTags } = seed();
    const service = new AdminTagsService(prisma);

    const result = await service.merge('tag-src', 'tag-dst', ACTOR);

    expect(result.movedVideos).toBe(1);
    expect(result.duplicatesDropped).toBe(1);
    expect(result.movedMediaItems).toBe(1);

    expect(getVideoTags().every((row) => row.tagId === 'tag-dst')).toBe(true);
    expect(getVideoTags()).toHaveLength(2);
    expect(getMediaTags()).toEqual([{ mediaItemId: 'm1', tagId: 'tag-dst' }]);

    const source = tags.find((t) => t.id === 'tag-src')!;
    expect(source.status).toBe('MERGED');
    expect(source.mergedIntoTagId).toBe('tag-dst');
    expect(source.normalizedName).toBeNull();
  });

  it('registers the source key as an alias so old links keep resolving', async () => {
    const { prisma, aliases } = seed();
    const service = new AdminTagsService(prisma);

    await service.merge('tag-src', 'tag-dst', ACTOR);

    expect(aliases).toContainEqual(
      expect.objectContaining({
        tagId: 'tag-dst',
        alias: 'Rally',
        normalizedAlias: 'rally',
      }),
    );
  });

  it('writes an audit entry naming both sides', async () => {
    const { prisma, audits } = seed();
    const service = new AdminTagsService(prisma);

    await service.merge('tag-src', 'tag-dst', ACTOR);

    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'TAG',
        entityId: 'tag-dst',
        action: 'TAG_MERGED',
        actorUserId: ACTOR,
        metadata: expect.objectContaining({ sourceTagId: 'tag-src' }),
      }),
    );
  });

  it('refuses to merge a tag into itself', async () => {
    const { prisma } = seed();
    const service = new AdminTagsService(prisma);

    await expect(
      service.merge('tag-src', 'tag-src', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('refuses to merge into a blocked tag', async () => {
    const { prisma, tags } = seed();
    tags.find((t) => t.id === 'tag-dst')!.status = 'BLOCKED';
    const service = new AdminTagsService(prisma);

    await expect(
      service.merge('tag-src', 'tag-dst', ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reports an unknown tag rather than silently succeeding', async () => {
    const { prisma } = seed();
    const service = new AdminTagsService(prisma);

    await expect(
      service.merge('tag-src', 'tag-ghost', ACTOR),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('previews the same numbers it will apply', async () => {
    const { prisma } = seed();
    const service = new AdminTagsService(prisma);

    const preview = await service.mergePreview('tag-src', 'tag-dst');
    const applied = await service.merge('tag-src', 'tag-dst', ACTOR);

    expect(preview.aliasCreated).toBe('rally');
    expect(preview.videosMoved).toBe(applied.movedVideos);
    expect(preview.duplicatesDropped).toBe(applied.duplicatesDropped);
  });
});

describe('AdminTagsService.list and addAlias (AC-07)', () => {
  it('lists tags with usage counts and pagination metadata', async () => {
    const tags = [
      {
        id: 'tag-1',
        name: 'Tutorial',
        slug: 'tutorial',
        normalizedName: 'tutorial',
        status: 'ACTIVE',
        preferred: true,
        createdById: 'creator-1',
        createdAt: new Date('2026-01-01'),
        translations: [{ locale: 'en', name: 'Tutorial', description: null }],
        aliases: [{ alias: 'how-to' }],
        mergedInto: null,
        _count: { videos: 4, mediaItems: 1 },
      },
    ];
    const prisma = {
      tag: {
        count: jest.fn(async () => 1),
        findMany: jest.fn(async () => tags),
      },
      user: {
        findMany: jest.fn(async () => [
          { id: 'creator-1', displayName: 'Creator One', username: 'creator1' },
        ]),
      },
    } as unknown as PrismaService;
    const service = new AdminTagsService(prisma);

    const result = await service.list({
      status: 'ACTIVE',
      page: 1,
      pageSize: 10,
    });

    expect(result.pagination.total).toBe(1);
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: 'tutorial',
        usageCount: 5,
        aliases: ['how-to'],
        createdBy: { id: 'creator-1', name: 'Creator One' },
      }),
    );
  });

  it('creates an alias when the name is free', async () => {
    const tag = {
      id: 'tag-1',
      name: 'AI',
      slug: 'ai',
      normalizedName: 'ai',
      status: 'ACTIVE',
    };
    const aliases: any[] = [];
    const audits: any[] = [];
    const prisma = {
      tag: {
        findUnique: jest.fn(async () => tag),
        findFirst: jest.fn(async () => null),
      },
      tagAlias: {
        findUnique: jest.fn(async () => null),
        create: jest.fn(async ({ data }: any) => {
          aliases.push(data);
          return { id: 'alias-1', ...data };
        }),
      },
      taxonomyAuditLog: {
        create: jest.fn(async ({ data }: any) => {
          audits.push(data);
          return data;
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminTagsService(prisma);

    const alias = await service.addAlias('tag-1', { alias: 'A.I.' }, ACTOR);

    expect(alias.normalizedAlias).toBe('a.i.');
    expect(audits).toContainEqual(
      expect.objectContaining({
        entityType: 'TAG',
        action: 'TAG_ALIAS_ADDED',
        actorUserId: ACTOR,
      }),
    );
  });
});

describe('AdminTagsService.createTag and updateTag (AC-07)', () => {
  it('creates an admin tag with canonical normalization', async () => {
    const audits: any[] = [];
    const prisma = {
      tag: {
        findFirst: jest.fn(async () => null),
        count: jest.fn(async () => 0),
        create: jest.fn(async ({ data, include }) => ({
          id: 'tag-new',
          ...data,
          translations: include?.translations
            ? [{ locale: 'en', name: data.name }]
            : [],
        })),
        update: jest.fn(),
      },
      tagAlias: { findUnique: jest.fn(async () => null) },
      tagTranslation: { upsert: jest.fn() },
      taxonomyAuditLog: {
        create: jest.fn(async ({ data }) => {
          audits.push(data);
          return data;
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminTagsService(prisma);

    const tag = await service.createTag({
      name: '  #Town Hall ',
      preferred: true,
      actorId: ACTOR,
    });

    expect(tag.slug).toBe('town-hall');
    expect(tag.normalizedName).toBe('town hall');
    expect(tag.preferred).toBe(true);
    expect(audits).toContainEqual(
      expect.objectContaining({
        action: 'TAXONOMY_CREATED',
        actorUserId: ACTOR,
      }),
    );
  });

  it('rejects creating a tag that duplicates an existing canonical key', async () => {
    const prisma = {
      tag: {
        findFirst: jest.fn(async () => ({
          id: 'tag-1',
          name: 'Town Hall',
          slug: 'town-hall',
        })),
      },
      tagAlias: { findUnique: jest.fn(async () => null) },
    } as unknown as PrismaService;
    const service = new AdminTagsService(prisma);

    await expect(
      service.createTag({ name: 'Town Hall', actorId: ACTOR }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('updates a tag name and preferred flag', async () => {
    const audits: any[] = [];
    const prisma = {
      tag: {
        findUnique: jest.fn(async () => ({
          id: 'tag-1',
          name: 'Old',
          slug: 'old',
          normalizedName: 'old',
          status: 'ACTIVE',
        })),
        findFirst: jest.fn(async () => null),
        update: jest.fn(async ({ data }) => ({ id: 'tag-1', ...data })),
      },
      tagAlias: { findUnique: jest.fn(async () => null) },
      tagTranslation: { upsert: jest.fn() },
      taxonomyAuditLog: {
        create: jest.fn(async ({ data }) => {
          audits.push(data);
          return data;
        }),
      },
    } as unknown as PrismaService;
    const service = new AdminTagsService(prisma);

    const updated = await service.updateTag('tag-1', {
      name: 'Featured Topic',
      preferred: true,
      actorId: ACTOR,
    });

    expect(updated.name).toBe('Featured Topic');
    expect(updated.preferred).toBe(true);
    expect(audits).toContainEqual(
      expect.objectContaining({ action: 'TAXONOMY_UPDATED' }),
    );
  });
});

describe('AdminTagsService.updateStatus (AC-07, AC-12)', () => {
  it('detaches assignments when a tag is blocked', async () => {
    const { prisma, tags, getVideoTags, audits } = makeStub({
      tags: [
        {
          id: 'tag-1',
          name: 'Spam',
          slug: 'spam',
          normalizedName: 'spam',
          status: 'ACTIVE',
        },
      ],
      videoTags: [{ videoId: 'v1', tagId: 'tag-1' }],
    });
    const service = new AdminTagsService(prisma);

    await service.updateStatus('tag-1', { status: 'BLOCKED' } as any, ACTOR);

    expect(tags[0].status).toBe('BLOCKED');
    expect(getVideoTags()).toHaveLength(0);
    expect(audits).toContainEqual(
      expect.objectContaining({ entityType: 'TAG', actorUserId: ACTOR }),
    );
  });

  it('refuses to change the status of a merged tag', async () => {
    const { prisma } = makeStub({
      tags: [
        {
          id: 'tag-1',
          name: 'Old',
          slug: 'old',
          normalizedName: null,
          status: 'MERGED',
          mergedIntoTagId: 'tag-2',
        },
      ],
    });
    const service = new AdminTagsService(prisma);

    await expect(
      service.updateStatus('tag-1', { status: 'ACTIVE' } as any, ACTOR),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
