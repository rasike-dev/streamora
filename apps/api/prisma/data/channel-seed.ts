/**
 * Sample channels mapped into Category > Subcategory.
 * Admins can reassign or add channels via /admin/taxonomy.
 */

export type ChannelSeed = {
  slug: string;
  name: string;
  categorySlug: string;
  subcategorySlug: string;
  sortOrder: number;
  translations: Array<{ locale: 'en' | 'si' | 'ta'; name: string }>;
};

export const CHANNEL_SEED: ChannelSeed[] = [
  {
    slug: 'leader-keynote',
    name: 'Leader Keynote',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'party-leader-speeches',
    sortOrder: 1,
    translations: [
      { locale: 'en', name: 'Leader Keynote' },
      { locale: 'si', name: 'නායක කථාව' },
      { locale: 'ta', name: 'தலைவர் உரை' },
    ],
  },
  {
    slug: 'parliament-floor',
    name: 'Parliament Floor',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'parliamentary-speeches',
    sortOrder: 2,
    translations: [
      { locale: 'en', name: 'Parliament Floor' },
      { locale: 'si', name: 'පාර්ලිමент කථා' },
      { locale: 'ta', name: 'நாடாளுமன்ற உரைகள்' },
    ],
  },
  {
    slug: 'presidential-rally',
    name: 'Presidential Rally',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'presidential-elections',
    sortOrder: 3,
    translations: [
      { locale: 'en', name: 'Presidential Rally' },
      { locale: 'si', name: 'ජනාධිපති මැතිවරණ රැළිය' },
      { locale: 'ta', name: 'ஜனாதிபதி பேரணி' },
    ],
  },
  {
    slug: 'local-council-campaign',
    name: 'Local Council Campaign',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'local-government-elections',
    sortOrder: 4,
    translations: [
      { locale: 'en', name: 'Local Council Campaign' },
      { locale: 'si', name: 'පළාත් පාලන තරග කටයුතු' },
      { locale: 'ta', name: 'உள்ளூர் சபை பிரச்சாரம்' },
    ],
  },
  {
    slug: 'annual-convention',
    name: 'Annual Convention',
    categorySlug: 'party-events',
    subcategorySlug: 'annual-conventions',
    sortOrder: 5,
    translations: [
      { locale: 'en', name: 'Annual Convention' },
      { locale: 'si', name: 'වාර්ෂික සමුළුව' },
      { locale: 'ta', name: 'ஆண்டு மாநாடு' },
    ],
  },
  {
    slug: 'tv-debate-clips',
    name: 'TV Debate Clips',
    categorySlug: 'media-coverage',
    subcategorySlug: 'tv-debates',
    sortOrder: 6,
    translations: [
      { locale: 'en', name: 'TV Debate Clips' },
      { locale: 'si', name: 'රූපවාහිනි විවාද' },
      { locale: 'ta', name: 'தொலைக்காட்சி விவாதம்' },
    ],
  },
  {
    slug: 'facebook-live',
    name: 'Facebook Live',
    categorySlug: 'social-media-content',
    subcategorySlug: 'facebook-videos',
    sortOrder: 7,
    translations: [
      { locale: 'en', name: 'Facebook Live' },
      { locale: 'si', name: 'Facebook Live' },
      { locale: 'ta', name: 'Facebook Live' },
    ],
  },
  {
    slug: 'colombo-district',
    name: 'Colombo District',
    categorySlug: 'district-local-content',
    subcategorySlug: 'district-campaigns',
    sortOrder: 8,
    translations: [
      { locale: 'en', name: 'Colombo District' },
      { locale: 'si', name: 'කොළඹ දිස්ත්‍රික්කය' },
      { locale: 'ta', name: 'Colombo District' },
    ],
  },
  {
    slug: 'candidate-training-room',
    name: 'Candidate Training',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'candidate-training',
    sortOrder: 9,
    translations: [
      { locale: 'en', name: 'Candidate Training' },
      { locale: 'si', name: 'අපේක්ෂක පුහුණුව' },
      { locale: 'ta', name: 'Candidate Training' },
    ],
  },
  {
    slug: 'historical-archive',
    name: 'Historical Archive',
    categorySlug: 'historical-archive',
    subcategorySlug: 'historical-speeches',
    sortOrder: 10,
    translations: [
      { locale: 'en', name: 'Historical Archive' },
      { locale: 'si', name: 'ඓතිහාසික සංග්‍රහය' },
      { locale: 'ta', name: 'Historical Speeches' },
    ],
  },
];
