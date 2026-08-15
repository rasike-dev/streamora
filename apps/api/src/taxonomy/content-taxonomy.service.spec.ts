import { BadRequestException } from '@nestjs/common';
import { ContentTaxonomyService } from './content-taxonomy.service';
import { PrismaService } from '../prisma/prisma.service';

type ChannelRow = { id: string; slug: string; isActive: boolean };

const CHANNELS: ChannelRow[] = [
  { id: 'ch-speeches', slug: 'speeches', isActive: true },
  { id: 'ch-rallies', slug: 'rallies', isActive: true },
  { id: 'ch-retired', slug: 'retired', isActive: false },
];

function prismaStub() {
  return {
    channel: {
      findMany: jest.fn(async ({ where }: any) => {
        const ids: string[] | undefined = where.id?.in;
        const slugs: string[] | undefined = where.slug?.in;

        return CHANNELS.filter((c) =>
          ids ? ids.includes(c.id) : slugs!.includes(c.slug),
        );
      }),
      findUnique: jest.fn(async ({ where }: any) => {
        const found = CHANNELS.find((c) => c.slug === where.slug);
        return found ? { id: found.id } : null;
      }),
    },
  } as unknown as PrismaService;
}

describe('ContentTaxonomyService', () => {
  let service: ContentTaxonomyService;

  beforeEach(() => {
    service = new ContentTaxonomyService(prismaStub());
  });

  describe('channel resolution (AC-08)', () => {
    it('resolves known active slugs and de-duplicates them', async () => {
      const ids = await service.resolveChannelIdsBySlug([
        'speeches',
        'rallies',
        'speeches',
      ]);

      expect(ids).toEqual(['ch-speeches', 'ch-rallies']);
    });

    it('rejects an unknown slug instead of silently dropping it', async () => {
      await expect(
        service.resolveChannelIdsBySlug(['speeches', 'typo']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an archived channel', async () => {
      await expect(
        service.resolveChannelIdsBySlug(['retired']),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('applies the same rules to the id-based path used by media', async () => {
      await expect(
        service.resolveChannelIdsById(['ch-retired']),
      ).rejects.toBeInstanceOf(BadRequestException);

      await expect(service.resolveChannelIdsById([])).resolves.toEqual([]);
    });
  });

  describe('primary-channel invariant (AC-08)', () => {
    it('defaults to the first assigned channel when none is requested', async () => {
      await expect(
        service.resolvePrimaryChannelId(['ch-speeches', 'ch-rallies']),
      ).resolves.toBe('ch-speeches');
    });

    it('honours an explicit primary that is among the assigned channels', async () => {
      await expect(
        service.resolvePrimaryChannelId(
          ['ch-speeches', 'ch-rallies'],
          'rallies',
        ),
      ).resolves.toBe('ch-rallies');
    });

    it('rejects a primary that is not one of the assigned channels', async () => {
      await expect(
        service.resolvePrimaryChannelId(['ch-speeches'], 'rallies'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('rejects an unknown primary slug', async () => {
      await expect(
        service.resolvePrimaryChannelId(['ch-speeches'], 'nope'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('clears the primary when no channels remain', async () => {
      await expect(
        service.resolvePrimaryChannelId([], 'speeches'),
      ).resolves.toBeNull();
      expect(service.resolvePrimaryChannelIdById([])).toBeNull();
    });

    it('enforces the same invariant on the id-based path', () => {
      expect(service.resolvePrimaryChannelIdById(['a', 'b'], 'b')).toBe('b');

      expect(() => service.resolvePrimaryChannelIdById(['a'], 'b')).toThrow(
        BadRequestException,
      );
    });
  });
});
