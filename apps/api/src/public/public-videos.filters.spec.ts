import { PublicVideosService } from './public-videos.service';
import { SearchService } from '../search/search.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The listing path builds a Prisma `where` object; these tests capture it to
 * confirm category, subcategory and channel constrain a single channel link
 * rather than three independent ones.
 */
function makeService() {
  const captured: any[] = [];

  const prisma = {
    video: {
      count: jest.fn(async ({ where }: any) => {
        captured.push(where);
        return 0;
      }),
      findMany: jest.fn(async () => []),
    },
    creatorProfile: { findMany: jest.fn(async () => []) },
  } as unknown as PrismaService;

  const search = {
    // Force the listing path; the ranked path is covered in search.service.spec.
    searchPublicVideos: jest.fn(async () => null),
  } as unknown as SearchService;

  return {
    service: new PublicVideosService(prisma, search),
    search,
    where: () => captured[captured.length - 1],
  };
}

describe('PublicVideosService listing filters (AC-09)', () => {
  it('applies no channel constraint when no taxonomy filter is given', async () => {
    const { service, where } = makeService();

    await service.listVideos({ locale: 'en' });

    expect(where().channels).toBeUndefined();
    expect(where()).toMatchObject({
      status: 'PUBLISHED',
      visibility: 'PUBLIC',
    });
  });

  it('filters by channel slug', async () => {
    const { service, where } = makeService();

    await service.listVideos({ locale: 'en', channel: 'rallies' });

    expect(where().channels).toEqual({
      some: { channel: { slug: 'rallies', isActive: true } },
    });
  });

  it('resolves a category filter through subcategory', async () => {
    const { service, where } = makeService();

    await service.listVideos({ locale: 'en', category: 'politics' });

    expect(where().channels.some.channel.subcategory).toEqual({
      isActive: true,
      category: { slug: 'politics', isActive: true },
    });
  });

  it('scopes a subcategory filter by its parent category when both are given', async () => {
    const { service, where } = makeService();

    await service.listVideos({
      locale: 'en',
      category: 'politics',
      subcategory: 'speeches',
    });

    expect(where().channels.some.channel.subcategory).toEqual({
      slug: 'speeches',
      isActive: true,
      category: { slug: 'politics', isActive: true },
    });
  });

  it('requires one channel to satisfy the channel and category filters together', async () => {
    const { service, where } = makeService();

    await service.listVideos({
      locale: 'en',
      category: 'politics',
      channel: 'rallies',
    });

    const channel = where().channels.some.channel;

    expect(channel.slug).toBe('rallies');
    expect(channel.subcategory.category.slug).toBe('politics');
    // One `some` clause, not one per filter.
    expect(Object.keys(where().channels)).toEqual(['some']);
  });

  it('filters by tag independently of the channel hierarchy', async () => {
    const { service, where } = makeService();

    await service.listVideos({ locale: 'en', tag: 'demo' });

    expect(where().tags).toEqual({ some: { tag: { slug: 'demo' } } });
    expect(where().channels).toBeUndefined();
  });

  it('echoes the applied filters back to the client', async () => {
    const { service } = makeService();

    const result = await service.listVideos({
      locale: 'en',
      category: 'politics',
      subcategory: 'speeches',
      channel: 'rallies',
      tag: 'demo',
    });

    expect(result.filters).toEqual({
      q: '',
      category: 'politics',
      subcategory: 'speeches',
      channel: 'rallies',
      tag: 'demo',
      locale: 'en',
    });
  });

  it('passes taxonomy filters into the ranked search path', async () => {
    const { service, search } = makeService();

    await service.listVideos({
      locale: 'en',
      q: 'speech',
      category: 'politics',
      subcategory: 'speeches',
    });

    expect(search.searchPublicVideos).toHaveBeenCalledWith(
      expect.objectContaining({
        q: 'speech',
        category: 'politics',
        subcategory: 'speeches',
      }),
    );
  });

  it('hydrates ranked search hits with channels and tags', async () => {
    const captured: any[] = [];
    const prisma = {
      video: {
        count: jest.fn(async () => 0),
        findMany: jest.fn(async ({ where }: any) => {
          captured.push(where);
          return [
            {
              id: 'video-1',
              slug: 'campaign-speech',
              publishedAt: new Date('2026-01-01'),
              uploaderVisible: false,
              uploaderId: null,
              translations: [
                {
                  locale: 'en',
                  title: 'Campaign Speech',
                  description: null,
                  tagline: null,
                },
              ],
              thumbnails: [],
              channels: [
                {
                  channel: {
                    slug: 'rallies',
                    name: 'Rallies',
                    translations: [{ locale: 'en', name: 'Rallies' }],
                  },
                },
              ],
              tags: [
                {
                  tag: {
                    slug: 'election',
                    name: 'Election',
                    translations: [{ locale: 'en', name: 'Election' }],
                  },
                },
              ],
              uploader: null,
            },
          ];
        }),
      },
      creatorProfile: { findMany: jest.fn(async () => []) },
    } as unknown as PrismaService;
    const search = {
      searchPublicVideos: jest.fn(async () => ({
        items: [
          { id: 'video-1', slug: 'campaign-speech', title: 'Campaign Speech' },
        ],
        pagination: { page: 1, pageSize: 12, total: 1, totalPages: 1 },
        searchMeta: { query: 'speech', mode: 'ranked' },
      })),
    } as unknown as SearchService;
    const service = new PublicVideosService(prisma, search);

    const result = await service.listVideos({ locale: 'en', q: 'speech' });

    expect(captured[0]).toEqual({ id: { in: ['video-1'] } });
    expect(result.searchMeta.mode).toBe('ranked');
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        slug: 'campaign-speech',
        channels: [{ slug: 'rallies', name: 'Rallies' }],
        tags: [{ slug: 'election', name: 'Election' }],
      }),
    );
  });
});
