import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

type RawCall = { sql: string; params: any[] };

function makeService(seed?: {
  searchResults?: Array<{ id: string; score: number }>;
  total?: number;
  videos?: any[];
}) {
  const calls: RawCall[] = [];
  const searchResults = seed?.searchResults ?? [{ id: 'video-1', score: 1 }];
  const total = seed?.total ?? 1;
  const videos = seed?.videos ?? [];

  const prisma = {
    $queryRawUnsafe: jest.fn(async (sql: string, ...params: any[]) => {
      calls.push({ sql, params });
      if (sql.includes('COUNT(*)')) return [{ count: total }];
      return searchResults;
    }),
    video: { findMany: jest.fn(async () => videos) },
  } as unknown as PrismaService;

  return { service: new SearchService(prisma), calls };
}

/** Every $n placeholder in the SQL must have a matching parameter. */
function placeholderIndexes(sql: string): number[] {
  return [...sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1]));
}

describe('SearchService.normalizeQuery', () => {
  it('trims, collapses whitespace and caps length', () => {
    const service = makeService().service;

    expect(service.normalizeQuery('  hello   world ')).toBe('hello world');
    expect(service.normalizeQuery(undefined)).toBe('');
    expect(service.normalizeQuery('x'.repeat(200))).toHaveLength(100);
  });
});

describe('SearchService parameter binding (AC-09)', () => {
  const base = { locale: 'en', q: 'speech', page: 1, pageSize: 12 };

  it('falls back to the listing path for queries shorter than two characters', async () => {
    const { service, calls } = makeService();

    await expect(
      service.searchPublicVideos({ ...base, q: 'a' }),
    ).resolves.toBeNull();
    expect(calls).toHaveLength(0);
  });

  it.each([
    ['no filters', {}],
    ['channel', { channel: 'rallies' }],
    ['tag', { tag: 'demo' }],
    ['category', { category: 'politics' }],
    ['subcategory', { subcategory: 'speeches' }],
    [
      'category + subcategory',
      { category: 'politics', subcategory: 'speeches' },
    ],
    [
      'every filter at once',
      {
        category: 'politics',
        subcategory: 'speeches',
        channel: 'rallies',
        tag: 'demo',
      },
    ],
  ])('binds every placeholder with %s', async (_label, filters) => {
    const { service, calls } = makeService();

    await service.searchPublicVideos({ ...base, ...filters });

    expect(calls).toHaveLength(2);

    for (const call of calls) {
      const indexes = placeholderIndexes(call.sql);
      const highest = Math.max(...indexes);

      expect(highest).toBe(call.params.length);
      // No gaps: $1..$highest must all be present.
      expect(new Set(indexes).size).toBe(highest);
    }
  });

  it('passes filter values through as parameters, never inlined into the SQL', async () => {
    const { service, calls } = makeService();

    await service.searchPublicVideos({
      ...base,
      channel: 'rallies\'; DROP TABLE "Video"; --',
      tag: 'demo',
    });

    const [paged] = calls;

    expect(paged.sql).not.toContain('DROP TABLE');
    expect(paged.params).toContain('rallies\'; DROP TABLE "Video"; --');
    expect(paged.params).toContain('demo');
  });

  it('appends LIMIT/OFFSET after the filters and omits them from the count query', async () => {
    const { service, calls } = makeService();

    await service.searchPublicVideos({ ...base, channel: 'rallies' });

    const [paged, total] = calls;

    expect(paged.params.slice(-2)).toEqual([12, 0]);
    expect(paged.sql).toMatch(/LIMIT \$4 OFFSET \$5/);
    expect(total.sql).not.toContain('LIMIT');
    expect(total.params).toEqual(['en', 'speech', 'rallies']);
  });

  it('filters through EXISTS so multi-channel videos are not double counted', async () => {
    const { service, calls } = makeService();

    await service.searchPublicVideos({ ...base, category: 'politics' });

    expect(calls[0].sql).toContain('EXISTS');
    expect(calls[0].sql).toContain('"Subcategory"');
    expect(calls[0].sql).toContain('"Category"');
  });

  it('returns an empty ranked page when the SQL finds no matches', async () => {
    const { service } = makeService({ searchResults: [] });

    const result = await service.searchPublicVideos(base);

    expect(result).toEqual({
      items: [],
      pagination: { page: 1, pageSize: 12, total: 0, totalPages: 0 },
      searchMeta: { query: 'speech', mode: 'ranked' },
    });
  });

  it('hydrates ranked hits with localized titles and thumbnail URLs', async () => {
    const { service } = makeService({
      videos: [
        {
          id: 'video-1',
          slug: 'campaign-speech',
          publishedAt: new Date('2026-01-01'),
          uploaderVisible: true,
          uploaderId: 'u1',
          translations: [
            { locale: 'si', title: 'කථාව', tagline: null, description: null },
          ],
          thumbnails: [
            { bucket: 'thumbs', objectKey: 'speech.jpg', isSelected: true },
          ],
          uploader: { displayName: 'Creator', username: 'creator' },
        },
      ],
    });

    const result = await service.searchPublicVideos({ ...base, locale: 'si' });

    expect(result?.items[0]).toEqual(
      expect.objectContaining({
        slug: 'campaign-speech',
        title: 'කථාව',
        uploader: 'Creator',
        thumbnailUrl: 'https://storage.googleapis.com/thumbs/speech.jpg',
      }),
    );
    expect(result?.searchMeta.mode).toBe('ranked');
  });
});
