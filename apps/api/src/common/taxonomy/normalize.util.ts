/**
 * Canonical identity helpers for taxonomy records.
 *
 * The SQL in prisma/migrations/20260815062000_backfill_tag_normalization mirrors
 * normalizeTagName() exactly. Any change here must be reflected there, otherwise
 * backfilled rows and runtime lookups disagree and duplicate tags reappear.
 */

export const MAX_TAG_NAME_LENGTH = 60;
export const MAX_TAGS_PER_ITEM = 15;

/** Terms that must not become user-created tags. */
const RESERVED_TAG_KEYS = new Set([
  'admin',
  'administrator',
  'moderator',
  'streamora',
  'system',
  'null',
  'undefined',
]);

/**
 * Build the comparison key used to decide whether two tag names are the same tag.
 * Trims, strips leading '#', trims again, collapses internal whitespace, applies
 * Unicode NFKC (so Sinhala/Tamil composed and decomposed forms match), then
 * lower-cases. The leading trim matters: " #tag" must key the same as "tag".
 */
export function normalizeTagName(input: string): string {
  if (!input) return '';

  return stripTagDecoration(input).normalize('NFKC').toLowerCase();
}

/** Shared trim/strip/collapse sequence behind both the key and the display name. */
function stripTagDecoration(input: string): string {
  return input.trim().replace(/^#+/, '').trim().replace(/\s+/g, ' ');
}

/**
 * URL-safe slug. Keeps Unicode letters, combining marks and the zero-width joiner
 * so Sinhala and Tamil names keep their vowel signs and conjuncts instead of being
 * mangled into a different word.
 */
export function slugify(input: string): string {
  const base = normalizeTagName(input)
    .replace(/[^\p{L}\p{N}\p{M}\u200d\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return base;
}

// Single shape rather than a discriminated union: the API's tsconfig runs with
// strictNullChecks disabled, where union narrowing on `ok` is not reliable.
export type TagNameValidation = {
  ok: boolean;
  reason?: string;
  name: string;
  normalized: string;
  slug: string;
};

/**
 * Validate a user-submitted tag name. Returns the canonical forms on success so
 * callers never have to re-derive them.
 */
export function validateTagName(input: string): TagNameValidation {
  const name = stripTagDecoration(input ?? '');
  const normalized = normalizeTagName(name);
  const slug = slugify(name);
  const invalid = (reason: string): TagNameValidation => ({
    ok: false,
    reason,
    name,
    normalized,
    slug,
  });

  if (!name) {
    return invalid('Tag name cannot be empty');
  }

  if (name.length > MAX_TAG_NAME_LENGTH) {
    return invalid(`Tag name cannot exceed ${MAX_TAG_NAME_LENGTH} characters`);
  }

  if (RESERVED_TAG_KEYS.has(normalized)) {
    return invalid(`"${name}" is a reserved tag name`);
  }

  if (!slug) {
    return invalid('Tag name must contain at least one letter or number');
  }

  return { ok: true, name, normalized, slug };
}

/**
 * Append a numeric discriminator until the slug is free.
 * `isTaken` is injected so this stays usable inside a transaction.
 */
export async function resolveUniqueSlug(
  base: string,
  isTaken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const seed = base || 'item';

  if (!(await isTaken(seed))) return seed;

  for (let suffix = 2; suffix < 1000; suffix++) {
    const candidate = `${seed}-${suffix}`;
    if (!(await isTaken(candidate))) return candidate;
  }

  return `${seed}-${Date.now()}`;
}
