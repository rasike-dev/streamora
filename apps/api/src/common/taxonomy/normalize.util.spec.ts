import {
  MAX_TAG_NAME_LENGTH,
  normalizeTagName,
  resolveUniqueSlug,
  slugify,
  validateTagName,
} from './normalize.util';

describe('normalizeTagName (AC-06)', () => {
  it('collapses the variations users actually type into one key', () => {
    const variants = [
      'Anura Kumara',
      'anura kumara',
      '  Anura   Kumara  ',
      '#AnuraKumara'.replace('AnuraKumara', 'Anura Kumara'),
      'ANURA KUMARA',
    ];

    const keys = new Set(variants.map(normalizeTagName));

    expect([...keys]).toEqual(['anura kumara']);
  });

  it('strips every leading hash, not just the first', () => {
    expect(normalizeTagName('##election')).toBe('election');
  });

  it('treats composed and decomposed Unicode as the same tag', () => {
    const composed = 'ශ්‍රී'.normalize('NFC');
    const decomposed = 'ශ්‍රී'.normalize('NFD');

    expect(normalizeTagName(composed)).toBe(normalizeTagName(decomposed));
  });

  it('returns an empty key for empty input', () => {
    expect(normalizeTagName('')).toBe('');
  });
});

describe('slugify', () => {
  it('produces a URL-safe slug', () => {
    expect(slugify('Election Campaigns 2026!')).toBe('election-campaigns-2026');
  });

  it('keeps Sinhala and Tamil letters instead of emptying the slug', () => {
    expect(slugify('මැතිවරණ')).toBe('මැතිවරණ');
    expect(slugify('தேர்தல்')).toBe('தேர்தல்');
  });

  it('drops punctuation-only input', () => {
    expect(slugify('!!!')).toBe('');
  });
});

describe('validateTagName', () => {
  it('accepts a normal name and returns canonical forms', () => {
    const result = validateTagName('  #Party Events ');

    expect(result.ok).toBe(true);
    expect(result.name).toBe('Party Events');
    expect(result.normalized).toBe('party events');
    expect(result.slug).toBe('party-events');
  });

  it.each([
    ['', 'empty'],
    ['   ', 'whitespace only'],
    ['!!!', 'punctuation only'],
    ['admin', 'reserved'],
    ['x'.repeat(MAX_TAG_NAME_LENGTH + 1), 'too long'],
  ])('rejects %s input (%s)', (input) => {
    const result = validateTagName(input);

    expect(result.ok).toBe(false);
    expect(result.reason).toBeTruthy();
  });
});

describe('resolveUniqueSlug', () => {
  it('returns the base slug when it is free', async () => {
    const slug = await resolveUniqueSlug('speeches', async () => false);

    expect(slug).toBe('speeches');
  });

  it('appends a discriminator until the slug is free', async () => {
    const taken = new Set(['speeches', 'speeches-2']);

    const slug = await resolveUniqueSlug('speeches', async (candidate) =>
      taken.has(candidate),
    );

    expect(slug).toBe('speeches-3');
  });

  it('falls back to a placeholder base when slugification emptied the name', async () => {
    const slug = await resolveUniqueSlug('', async () => false);

    expect(slug).toBe('item');
  });
});
