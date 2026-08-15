import { PrismaClient } from '@prisma/client';
import { TAXONOMY_SEED } from './data/taxonomy-seed';
import { normalizeTagName } from '../src/common/taxonomy/normalize.util';

const prisma = new PrismaClient();

/**
 * Seeds the admin-editable Category > Subcategory taxonomy.
 *
 * Idempotent: re-running refreshes names, ordering and translations but never
 * resurrects a category an admin archived, and never re-parents channels.
 */
async function seedTaxonomy() {
  let categories = 0;
  let subcategories = 0;

  for (const [index, category] of TAXONOMY_SEED.entries()) {
    const categoryRecord = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        displayOrder: index + 1,
      },
      create: {
        slug: category.slug,
        name: category.name,
        description: category.description,
        displayOrder: index + 1,
        isActive: true,
      },
    });
    categories++;

    for (const translation of category.translations) {
      await prisma.categoryTranslation.upsert({
        where: {
          categoryId_locale: {
            categoryId: categoryRecord.id,
            locale: translation.locale,
          },
        },
        update: { name: translation.name },
        create: {
          categoryId: categoryRecord.id,
          locale: translation.locale,
          name: translation.name,
        },
      });
    }

    for (const [subIndex, subcategory] of category.subcategories.entries()) {
      const subcategoryRecord = await prisma.subcategory.upsert({
        where: {
          categoryId_slug: {
            categoryId: categoryRecord.id,
            slug: subcategory.slug,
          },
        },
        update: {
          name: subcategory.name,
          displayOrder: subIndex + 1,
        },
        create: {
          categoryId: categoryRecord.id,
          slug: subcategory.slug,
          name: subcategory.name,
          displayOrder: subIndex + 1,
          isActive: true,
        },
      });
      subcategories++;

      for (const translation of subcategory.translations) {
        await prisma.subcategoryTranslation.upsert({
          where: {
            subcategoryId_locale: {
              subcategoryId: subcategoryRecord.id,
              locale: translation.locale,
            },
          },
          update: { name: translation.name },
          create: {
            subcategoryId: subcategoryRecord.id,
            locale: translation.locale,
            name: translation.name,
          },
        });
      }
    }
  }

  return { categories, subcategories };
}

/**
 * Demo channels and tags kept from the original seed.
 *
 * These channels are intentionally left without a subcategory so the admin
 * "Unmapped channels" workflow has something real to resolve after a fresh setup.
 */
async function seedDemoContent() {
  const channel1 = await prisma.channel.upsert({
    where: { slug: 'technology' },
    update: {},
    create: {
      name: 'Technology',
      slug: 'technology',
      isActive: true,
      sortOrder: 1,
      translations: {
        create: [
          { locale: 'en', name: 'Technology' },
          { locale: 'si', name: 'තාක්ෂණය' },
          { locale: 'ta', name: 'தொழில்நுட்பம்' },
        ],
      },
    },
  });

  const channel2 = await prisma.channel.upsert({
    where: { slug: 'education' },
    update: {},
    create: {
      name: 'Education',
      slug: 'education',
      isActive: true,
      sortOrder: 2,
      translations: {
        create: [
          { locale: 'en', name: 'Education' },
          { locale: 'si', name: 'අධ්‍යාපනය' },
          { locale: 'ta', name: 'கல்வி' },
        ],
      },
    },
  });

  const tag1 = await prisma.tag.upsert({
    where: { slug: 'tutorial' },
    update: { normalizedName: normalizeTagName('Tutorial') },
    create: {
      name: 'Tutorial',
      slug: 'tutorial',
      normalizedName: normalizeTagName('Tutorial'),
      preferred: true,
      translations: {
        create: [
          { locale: 'en', name: 'Tutorial' },
          { locale: 'si', name: 'උපදේශනය' },
          { locale: 'ta', name: 'பயிற்சி' },
        ],
      },
    },
  });

  const tag2 = await prisma.tag.upsert({
    where: { slug: 'beginner' },
    update: { normalizedName: normalizeTagName('Beginner') },
    create: {
      name: 'Beginner',
      slug: 'beginner',
      normalizedName: normalizeTagName('Beginner'),
      preferred: false,
      translations: {
        create: [
          { locale: 'en', name: 'Beginner' },
          { locale: 'si', name: 'ආරම්භක' },
          { locale: 'ta', name: 'தொடக்கநிலை' },
        ],
      },
    },
  });

  return { channel1, channel2, tag1, tag2 };
}

async function main() {
  const taxonomy = await seedTaxonomy();
  const demo = await seedDemoContent();

  console.log(
    `Seeded taxonomy: ${taxonomy.categories} categories, ${taxonomy.subcategories} subcategories`,
  );
  console.log(
    `Seeded demo content: channels ${demo.channel1.slug}, ${demo.channel2.slug}; tags ${demo.tag1.slug}, ${demo.tag2.slug}`,
  );
  console.log(
    'Demo channels are intentionally unmapped - assign them under /admin/taxonomy.',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
