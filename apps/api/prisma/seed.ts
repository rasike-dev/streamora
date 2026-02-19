import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create sample channels
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

  // Create sample tags
  const tag1 = await prisma.tag.upsert({
    where: { slug: 'tutorial' },
    update: {},
    create: {
      name: 'Tutorial',
      slug: 'tutorial',
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
    update: {},
    create: {
      name: 'Beginner',
      slug: 'beginner',
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

  console.log('Seeded:', { channel1, channel2, tag1, tag2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
