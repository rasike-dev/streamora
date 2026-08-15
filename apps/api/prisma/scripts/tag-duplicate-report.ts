/**
 * Lists tags that collide on their normalized name.
 *
 * Run between the backfill and enforce migrations. The backfill deliberately leaves
 * the loser of each collision with normalizedName = NULL so the unique index cannot
 * fail; this report tells admins which tags still need a merge before those NULL
 * rows can participate in canonical lookup.
 *
 *   pnpm --filter api tag:duplicates
 */
import { PrismaClient } from '@prisma/client';
import { normalizeTagName } from '../../src/common/taxonomy/normalize.util';

const prisma = new PrismaClient();

type Row = {
  id: string;
  name: string;
  slug: string;
  normalizedName: string | null;
  createdAt: Date;
  usage: number;
};

async function main() {
  const tags = await prisma.tag.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      normalizedName: true,
      createdAt: true,
      _count: { select: { videos: true, mediaItems: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const groups = new Map<string, Row[]>();

  for (const tag of tags) {
    const key = normalizeTagName(tag.name);
    if (!key) continue;

    const row: Row = {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      normalizedName: tag.normalizedName,
      createdAt: tag.createdAt,
      usage: tag._count.videos + tag._count.mediaItems,
    };

    const existing = groups.get(key);
    if (existing) existing.push(row);
    else groups.set(key, [row]);
  }

  const collisions = [...groups.entries()].filter(([, rows]) => rows.length > 1);
  const unresolved = tags.filter((tag) => tag.normalizedName === null);

  console.log(`Tags scanned:            ${tags.length}`);
  console.log(`Colliding groups:        ${collisions.length}`);
  console.log(`Rows without a key:      ${unresolved.length}`);

  if (collisions.length === 0) {
    console.log('\nNo duplicates. Safe to run the enforce migration.');
    return;
  }

  console.log('\nMerge these before relying on canonical tag lookup:\n');

  for (const [key, rows] of collisions) {
    const sorted = [...rows].sort((a, b) => b.usage - a.usage);
    const keeper = sorted.find((r) => r.normalizedName !== null) ?? sorted[0];

    console.log(`  "${key}"`);
    for (const row of sorted) {
      const role = row.id === keeper.id ? 'KEEP  ' : 'MERGE ';
      const keyed = row.normalizedName === null ? ' (no key)' : '';
      console.log(
        `    ${role} ${row.slug.padEnd(28)} usage=${String(row.usage).padEnd(5)} id=${row.id}${keyed}`,
      );
    }
    console.log(
      `    -> POST /admin/tags/{loserId}/merge { "targetTagId": "${keeper.id}" }\n`,
    );
  }

  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
