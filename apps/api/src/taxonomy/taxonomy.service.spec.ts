import { TaxonomyService } from './taxonomy.service';
import { PrismaService } from '../prisma/prisma.service';

function serviceWithChannel(channel: any) {
  const prisma = {
    channel: { findUnique: jest.fn(async () => channel) },
  } as unknown as PrismaService;

  return new TaxonomyService(prisma);
}

describe('TaxonomyService.localize', () => {
  const service = serviceWithChannel(null);

  it('prefers the requested locale', () => {
    expect(
      service.localize(
        [
          { locale: 'en', name: 'Speeches' },
          { locale: 'si', name: 'කථා' },
        ],
        'si',
        'Speeches',
      ),
    ).toBe('කථා');
  });

  it('falls back to English, then to the base column', () => {
    expect(
      service.localize([{ locale: 'en', name: 'Speeches' }], 'ta', 'Base'),
    ).toBe('Speeches');

    expect(service.localize([], 'ta', 'Base')).toBe('Base');
    expect(service.localize(undefined, 'ta', 'Base')).toBe('Base');
  });
});

describe('TaxonomyService.getChannelBreadcrumb (AC-08)', () => {
  it('returns the localized Category > Subcategory > Channel trail', async () => {
    const service = serviceWithChannel({
      slug: 'rallies',
      name: 'Rallies',
      translations: [{ locale: 'si', name: 'රැලි' }],
      subcategory: {
        slug: 'public-meetings',
        name: 'Public Meetings',
        translations: [{ locale: 'si', name: 'ප්‍රසිද්ධ රැස්වීම්' }],
        category: {
          slug: 'leadership-speeches',
          name: 'Leadership & Speeches',
          translations: [{ locale: 'si', name: 'නායකත්වය' }],
        },
      },
    });

    const breadcrumb = await service.getChannelBreadcrumb('ch-1', 'si');

    expect(breadcrumb).toEqual({
      category: { slug: 'leadership-speeches', name: 'නායකත්වය' },
      subcategory: { slug: 'public-meetings', name: 'ප්‍රසිද්ධ රැස්වීම්' },
      channel: { slug: 'rallies', name: 'රැලි' },
    });
  });

  it('still renders an unmapped channel, with null ancestors', async () => {
    const service = serviceWithChannel({
      slug: 'legacy',
      name: 'Legacy',
      translations: [],
      subcategory: null,
    });

    const breadcrumb = await service.getChannelBreadcrumb('ch-legacy', 'en');

    expect(breadcrumb).toEqual({
      category: null,
      subcategory: null,
      channel: { slug: 'legacy', name: 'Legacy' },
    });
  });

  it('returns null for a channel that no longer exists', async () => {
    const service = serviceWithChannel(null);

    await expect(
      service.getChannelBreadcrumb('gone', 'en'),
    ).resolves.toBeNull();
  });
});
