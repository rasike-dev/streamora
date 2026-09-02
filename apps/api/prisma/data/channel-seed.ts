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
  // Leadership & Speeches
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
    slug: 'national-organizer-addresses',
    name: 'National Organizer Addresses',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'national-organizer-speeches',
    sortOrder: 2,
    translations: [
      { locale: 'en', name: 'National Organizer Addresses' },
      { locale: 'si', name: 'ජාතික සංවිධායක කථා' },
      { locale: 'ta', name: 'தேசிய அமைப்பாளர் உரைகள்' },
    ],
  },
  {
    slug: 'parliament-floor',
    name: 'Parliament Floor',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'parliamentary-speeches',
    sortOrder: 3,
    translations: [
      { locale: 'en', name: 'Parliament Floor' },
      { locale: 'si', name: 'පාර්ලිමент කථා' },
      { locale: 'ta', name: 'நாடாளுமன்ற உரைகள்' },
    ],
  },
  {
    slug: 'public-town-hall',
    name: 'Public Town Hall',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'public-meetings',
    sortOrder: 4,
    translations: [
      { locale: 'en', name: 'Public Town Hall' },
      { locale: 'si', name: 'ප්‍රසිද්ධ රැස්වීම්' },
      { locale: 'ta', name: 'பொதுக் கூட்டங்கள்' },
    ],
  },
  {
    slug: 'special-addresses',
    name: 'Special Addresses',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'special-addresses',
    sortOrder: 5,
    translations: [
      { locale: 'en', name: 'Special Addresses' },
      { locale: 'si', name: 'විශේෂ දේශන' },
      { locale: 'ta', name: 'சிறப்பு உரைகள்' },
    ],
  },
  {
    slug: 'weekly-press-briefing',
    name: 'Weekly Press Briefing',
    categorySlug: 'leadership-speeches',
    subcategorySlug: 'press-statements',
    sortOrder: 6,
    translations: [
      { locale: 'en', name: 'Weekly Press Briefing' },
      { locale: 'si', name: 'මාධ්‍ය නිවේදන' },
      { locale: 'ta', name: 'ஊடக அறிக்கைகள்' },
    ],
  },

  // Election Campaigns
  {
    slug: 'presidential-rally',
    name: 'Presidential Rally',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'presidential-elections',
    sortOrder: 10,
    translations: [
      { locale: 'en', name: 'Presidential Rally' },
      { locale: 'si', name: 'ජනාධිපති මැතිවරණ රැළිය' },
      { locale: 'ta', name: 'ஜனாதிபதி பேரணி' },
    ],
  },
  {
    slug: 'parliamentary-campaign-trail',
    name: 'Parliamentary Campaign Trail',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'parliamentary-elections',
    sortOrder: 11,
    translations: [
      { locale: 'en', name: 'Parliamentary Campaign Trail' },
      { locale: 'si', name: 'පාර්ලිමේන්තු මැතිවරණ ප්‍රචාරක' },
      { locale: 'ta', name: 'நாடாளுமன்றத் தேர்தல் பிரச்சாரம்' },
    ],
  },
  {
    slug: 'provincial-council-rally',
    name: 'Provincial Council Rally',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'provincial-council-elections',
    sortOrder: 12,
    translations: [
      { locale: 'en', name: 'Provincial Council Rally' },
      { locale: 'si', name: 'පළාත් සභා මැතිවරණ රැළිය' },
      { locale: 'ta', name: 'மாகாண சபைத் தேர்தல் பேரணி' },
    ],
  },
  {
    slug: 'local-council-campaign',
    name: 'Local Council Campaign',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'local-government-elections',
    sortOrder: 13,
    translations: [
      { locale: 'en', name: 'Local Council Campaign' },
      { locale: 'si', name: 'පළාත් පාලන තරග කටයුතු' },
      { locale: 'ta', name: 'உள்ளூர் சபை பிரச்சாரம்' },
    ],
  },
  {
    slug: 'campaign-spotlight',
    name: 'Campaign Spotlight',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'campaign-advertisements',
    sortOrder: 14,
    translations: [
      { locale: 'en', name: 'Campaign Spotlight' },
      { locale: 'si', name: 'ප්‍රචාරක දැන්වීම්' },
      { locale: 'ta', name: 'பிரச்சார விளம்பரங்கள்' },
    ],
  },
  {
    slug: 'campaign-kickoff',
    name: 'Campaign Kickoff',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'campaign-launches',
    sortOrder: 15,
    translations: [
      { locale: 'en', name: 'Campaign Kickoff' },
      { locale: 'si', name: 'ප්‍රචාරක ආරම්භ' },
      { locale: 'ta', name: 'பிரச்சாரத் தொடக்கம்' },
    ],
  },
  {
    slug: 'victory-rally',
    name: 'Victory Rally',
    categorySlug: 'election-campaigns',
    subcategorySlug: 'victory-celebrations',
    sortOrder: 16,
    translations: [
      { locale: 'en', name: 'Victory Rally' },
      { locale: 'si', name: 'ජයග්‍රහණ සැමරුම' },
      { locale: 'ta', name: 'வெற்றிக் கொண்டாட்டம்' },
    ],
  },

  // Party Events
  {
    slug: 'annual-convention',
    name: 'Annual Convention',
    categorySlug: 'party-events',
    subcategorySlug: 'annual-conventions',
    sortOrder: 20,
    translations: [
      { locale: 'en', name: 'Annual Convention' },
      { locale: 'si', name: 'වාර්ෂික සමුළුව' },
      { locale: 'ta', name: 'ஆண்டு மாநாடு' },
    ],
  },
  {
    slug: 'party-conference-hall',
    name: 'Party Conference Hall',
    categorySlug: 'party-events',
    subcategorySlug: 'party-conferences',
    sortOrder: 21,
    translations: [
      { locale: 'en', name: 'Party Conference Hall' },
      { locale: 'si', name: 'පක්ෂ සමුළු' },
      { locale: 'ta', name: 'கட்சி மாநாடு' },
    ],
  },
  {
    slug: 'membership-drive',
    name: 'Membership Drive',
    categorySlug: 'party-events',
    subcategorySlug: 'membership-programs',
    sortOrder: 22,
    translations: [
      { locale: 'en', name: 'Membership Drive' },
      { locale: 'si', name: 'සාමාජික වැඩසටහන්' },
      { locale: 'ta', name: 'உறுப்பினர் திட்டம்' },
    ],
  },
  {
    slug: 'organizer-training',
    name: 'Organizer Training',
    categorySlug: 'party-events',
    subcategorySlug: 'training-programs',
    sortOrder: 23,
    translations: [
      { locale: 'en', name: 'Organizer Training' },
      { locale: 'si', name: 'පුහුණු වැඩසටහන්' },
      { locale: 'ta', name: 'பயிற்சித் திட்டம்' },
    ],
  },
  {
    slug: 'youth-wing-rally',
    name: 'Youth Wing Rally',
    categorySlug: 'party-events',
    subcategorySlug: 'youth-wing-events',
    sortOrder: 24,
    translations: [
      { locale: 'en', name: 'Youth Wing Rally' },
      { locale: 'si', name: 'තරුණ අංශ උත්සව' },
      { locale: 'ta', name: 'இளைஞர் அணி நிகழ்வு' },
    ],
  },
  {
    slug: 'womens-wing-forum',
    name: "Women's Wing Forum",
    categorySlug: 'party-events',
    subcategorySlug: 'womens-wing-events',
    sortOrder: 25,
    translations: [
      { locale: 'en', name: "Women's Wing Forum" },
      { locale: 'si', name: 'කාන්තා අංශ උත්සව' },
      { locale: 'ta', name: 'மகளிர் அணி நிகழ்வு' },
    ],
  },

  // Media Coverage
  {
    slug: 'prime-time-interview',
    name: 'Prime Time Interview',
    categorySlug: 'media-coverage',
    subcategorySlug: 'tv-interviews',
    sortOrder: 30,
    translations: [
      { locale: 'en', name: 'Prime Time Interview' },
      { locale: 'si', name: 'රූපවාහිනී සම්මුඛ සාකච්ඡා' },
      { locale: 'ta', name: 'தொலைக்காட்சி நேர்காணல்' },
    ],
  },
  {
    slug: 'tv-debate-clips',
    name: 'TV Debate Clips',
    categorySlug: 'media-coverage',
    subcategorySlug: 'tv-debates',
    sortOrder: 31,
    translations: [
      { locale: 'en', name: 'TV Debate Clips' },
      { locale: 'si', name: 'රූපවාහිනි විවාද' },
      { locale: 'ta', name: 'தொலைக்காட்சி விவாதம்' },
    ],
  },
  {
    slug: 'evening-news-clips',
    name: 'Evening News Clips',
    categorySlug: 'media-coverage',
    subcategorySlug: 'news-coverage',
    sortOrder: 32,
    translations: [
      { locale: 'en', name: 'Evening News Clips' },
      { locale: 'si', name: 'ප්‍රවෘත්ති ආවරණය' },
      { locale: 'ta', name: 'செய்தி வெளியீடு' },
    ],
  },
  {
    slug: 'media-briefing',
    name: 'Media Briefing',
    categorySlug: 'media-coverage',
    subcategorySlug: 'press-conferences',
    sortOrder: 33,
    translations: [
      { locale: 'en', name: 'Media Briefing' },
      { locale: 'si', name: 'මාධ්‍ය හමු' },
      { locale: 'ta', name: 'ஊடகச் சந்திப்பு' },
    ],
  },
  {
    slug: 'radio-talk-show',
    name: 'Radio Talk Show',
    categorySlug: 'media-coverage',
    subcategorySlug: 'radio-programs',
    sortOrder: 34,
    translations: [
      { locale: 'en', name: 'Radio Talk Show' },
      { locale: 'si', name: 'ගුවන්විදුලි වැඩසටහන' },
      { locale: 'ta', name: 'வானொலி நிகழ்ச்சி' },
    ],
  },
  {
    slug: 'party-podcast',
    name: 'Party Podcast',
    categorySlug: 'media-coverage',
    subcategorySlug: 'podcasts',
    sortOrder: 35,
    translations: [
      { locale: 'en', name: 'Party Podcast' },
      { locale: 'si', name: 'පොඩ්කාස්ට්' },
      { locale: 'ta', name: 'பாட்காஸ்ட்' },
    ],
  },

  // Social Media Content
  {
    slug: 'facebook-live',
    name: 'Facebook Live',
    categorySlug: 'social-media-content',
    subcategorySlug: 'facebook-videos',
    sortOrder: 40,
    translations: [
      { locale: 'en', name: 'Facebook Live' },
      { locale: 'si', name: 'Facebook Live' },
      { locale: 'ta', name: 'Facebook Live' },
    ],
  },
  {
    slug: 'tiktok-highlights',
    name: 'TikTok Highlights',
    categorySlug: 'social-media-content',
    subcategorySlug: 'tiktok-videos',
    sortOrder: 41,
    translations: [
      { locale: 'en', name: 'TikTok Highlights' },
      { locale: 'si', name: 'ටික්ටොක් වීඩියෝ' },
      { locale: 'ta', name: 'டிக்டாக் காணொளிகள்' },
    ],
  },
  {
    slug: 'youtube-shorts-daily',
    name: 'YouTube Shorts Daily',
    categorySlug: 'social-media-content',
    subcategorySlug: 'youtube-shorts',
    sortOrder: 42,
    translations: [
      { locale: 'en', name: 'YouTube Shorts Daily' },
      { locale: 'si', name: 'යූටියුබ් ෂෝට්ස්' },
      { locale: 'ta', name: 'யூடியூப் ஷார்ட்ஸ்' },
    ],
  },
  {
    slug: 'instagram-reels-hub',
    name: 'Instagram Reels Hub',
    categorySlug: 'social-media-content',
    subcategorySlug: 'instagram-reels',
    sortOrder: 43,
    translations: [
      { locale: 'en', name: 'Instagram Reels Hub' },
      { locale: 'si', name: 'ඉන්ස්ටග්‍රෑම් රීල්ස්' },
      { locale: 'ta', name: 'இன்ஸ்டாகிராம் ரீல்ஸ்' },
    ],
  },
  {
    slug: 'x-clips',
    name: 'X Clips',
    categorySlug: 'social-media-content',
    subcategorySlug: 'x-twitter-videos',
    sortOrder: 44,
    translations: [
      { locale: 'en', name: 'X Clips' },
      { locale: 'si', name: 'X/ට්විටර් වීඩියෝ' },
      { locale: 'ta', name: 'X/ட்விட்டர் காணொளிகள்' },
    ],
  },
  {
    slug: 'viral-moments',
    name: 'Viral Moments',
    categorySlug: 'social-media-content',
    subcategorySlug: 'viral-content',
    sortOrder: 45,
    translations: [
      { locale: 'en', name: 'Viral Moments' },
      { locale: 'si', name: 'වයිරල් අන්තර්ගතය' },
      { locale: 'ta', name: 'வைரல் உள்ளடக்கம்' },
    ],
  },

  // District & Local Content
  {
    slug: 'colombo-district',
    name: 'Colombo District',
    categorySlug: 'district-local-content',
    subcategorySlug: 'district-campaigns',
    sortOrder: 50,
    translations: [
      { locale: 'en', name: 'Colombo District' },
      { locale: 'si', name: 'කොළඹ දිස්ත්‍රික්කය' },
      { locale: 'ta', name: 'கொழும்பு மாவட்டம்' },
    ],
  },
  {
    slug: 'kandy-district',
    name: 'Kandy District',
    categorySlug: 'district-local-content',
    subcategorySlug: 'district-campaigns',
    sortOrder: 51,
    translations: [
      { locale: 'en', name: 'Kandy District' },
      { locale: 'si', name: 'මහනුවර දිස්ත්‍රික්කය' },
      { locale: 'ta', name: 'கண்டி மாவட்டம்' },
    ],
  },
  {
    slug: 'grassroots-organizers',
    name: 'Grassroots Organizers',
    categorySlug: 'district-local-content',
    subcategorySlug: 'electoral-organizers',
    sortOrder: 52,
    translations: [
      { locale: 'en', name: 'Grassroots Organizers' },
      { locale: 'si', name: 'මැතිවරණ සංවිධායක' },
      { locale: 'ta', name: 'தேர்தல் அமைப்பாளர்கள்' },
    ],
  },
  {
    slug: 'local-wins',
    name: 'Local Wins',
    categorySlug: 'district-local-content',
    subcategorySlug: 'local-success-stories',
    sortOrder: 53,
    translations: [
      { locale: 'en', name: 'Local Wins' },
      { locale: 'si', name: 'ප්‍රාදේශීය සාර්ථක කතා' },
      { locale: 'ta', name: 'உள்ளூர் வெற்றிக் கதைகள்' },
    ],
  },
  {
    slug: 'community-outreach',
    name: 'Community Outreach',
    categorySlug: 'district-local-content',
    subcategorySlug: 'community-events',
    sortOrder: 54,
    translations: [
      { locale: 'en', name: 'Community Outreach' },
      { locale: 'si', name: 'ප්‍රජා උත්සව' },
      { locale: 'ta', name: 'சமூக நிகழ்வுகள்' },
    ],
  },
  {
    slug: 'village-gatherings',
    name: 'Village Gatherings',
    categorySlug: 'district-local-content',
    subcategorySlug: 'village-meetings',
    sortOrder: 55,
    translations: [
      { locale: 'en', name: 'Village Gatherings' },
      { locale: 'si', name: 'ගම් රැස්වීම්' },
      { locale: 'ta', name: 'கிராமக் கூட்டங்கள்' },
    ],
  },

  // Historical Archive
  {
    slug: 'historical-archive',
    name: 'Historical Archive',
    categorySlug: 'historical-archive',
    subcategorySlug: 'historical-speeches',
    sortOrder: 60,
    translations: [
      { locale: 'en', name: 'Historical Archive' },
      { locale: 'si', name: 'ඓතිහාසික සංග්‍රහය' },
      { locale: 'ta', name: 'வரலாற்று உரைகள்' },
    ],
  },
  {
    slug: 'election-rewind',
    name: 'Election Rewind',
    categorySlug: 'historical-archive',
    subcategorySlug: 'election-archives',
    sortOrder: 61,
    translations: [
      { locale: 'en', name: 'Election Rewind' },
      { locale: 'si', name: 'මැතිවරණ සංරක්ෂිත' },
      { locale: 'ta', name: 'தேர்தல் ஆவணக் காப்பகம்' },
    ],
  },
  {
    slug: 'founding-milestones',
    name: 'Founding Milestones',
    categorySlug: 'historical-archive',
    subcategorySlug: 'party-milestones',
    sortOrder: 62,
    translations: [
      { locale: 'en', name: 'Founding Milestones' },
      { locale: 'si', name: 'පක්ෂ සන්ධිස්ථාන' },
      { locale: 'ta', name: 'கட்சி மைல்கற்கள்' },
    ],
  },
  {
    slug: 'political-timeline',
    name: 'Political Timeline',
    categorySlug: 'historical-archive',
    subcategorySlug: 'political-history',
    sortOrder: 63,
    translations: [
      { locale: 'en', name: 'Political Timeline' },
      { locale: 'si', name: 'දේශපාලන ඉතිහාසය' },
      { locale: 'ta', name: 'அரசியல் வரலாறு' },
    ],
  },
  {
    slug: 'legacy-leaders-series',
    name: 'Legacy Leaders Series',
    categorySlug: 'historical-archive',
    subcategorySlug: 'legacy-leaders',
    sortOrder: 64,
    translations: [
      { locale: 'en', name: 'Legacy Leaders Series' },
      { locale: 'si', name: 'පූර්වගාමී නායකයෝ' },
      { locale: 'ta', name: 'முன்னோடித் தலைவர்கள்' },
    ],
  },

  // Training & Capacity Building
  {
    slug: 'candidate-training-room',
    name: 'Candidate Training',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'candidate-training',
    sortOrder: 70,
    translations: [
      { locale: 'en', name: 'Candidate Training' },
      { locale: 'si', name: 'අපේක්ෂක පුහුණුව' },
      { locale: 'ta', name: 'வேட்பாளர் பயிற்சி' },
    ],
  },
  {
    slug: 'social-media-bootcamp',
    name: 'Social Media Bootcamp',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'social-media-training',
    sortOrder: 71,
    translations: [
      { locale: 'en', name: 'Social Media Bootcamp' },
      { locale: 'si', name: 'සමාජ මාධ්‍ය පුහුණුව' },
      { locale: 'ta', name: 'சமூக ஊடகப் பயிற்சி' },
    ],
  },
  {
    slug: 'volunteer-orientation',
    name: 'Volunteer Orientation',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'volunteer-training',
    sortOrder: 72,
    translations: [
      { locale: 'en', name: 'Volunteer Orientation' },
      { locale: 'si', name: 'ස්වේච්ඡා පුහුණුව' },
      { locale: 'ta', name: 'தன்னார்வலர் பயிற்சி' },
    ],
  },
  {
    slug: 'campaign-ops',
    name: 'Campaign Operations',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'campaign-management',
    sortOrder: 73,
    translations: [
      { locale: 'en', name: 'Campaign Operations' },
      { locale: 'si', name: 'ප්‍රචාරක කළමනාකරණය' },
      { locale: 'ta', name: 'பிரச்சார நிர்வாகம்' },
    ],
  },
  {
    slug: 'digital-comms-lab',
    name: 'Digital Comms Lab',
    categorySlug: 'training-capacity-building',
    subcategorySlug: 'digital-communication',
    sortOrder: 74,
    translations: [
      { locale: 'en', name: 'Digital Comms Lab' },
      { locale: 'si', name: 'ඩිජිටල් සන්නිවේදනය' },
      { locale: 'ta', name: 'டிஜிட்டல் தகவல் தொடர்பு' },
    ],
  },

  // Community Engagement
  {
    slug: 'temple-festival',
    name: 'Temple Festival',
    categorySlug: 'community-engagement',
    subcategorySlug: 'religious-events',
    sortOrder: 80,
    translations: [
      { locale: 'en', name: 'Temple Festival' },
      { locale: 'si', name: 'ආගමික උත්සව' },
      { locale: 'ta', name: 'மத நிகழ்வுகள்' },
    ],
  },
  {
    slug: 'cultural-showcase',
    name: 'Cultural Showcase',
    categorySlug: 'community-engagement',
    subcategorySlug: 'cultural-events',
    sortOrder: 81,
    translations: [
      { locale: 'en', name: 'Cultural Showcase' },
      { locale: 'si', name: 'සංස්කෘතික උත්සව' },
      { locale: 'ta', name: 'கலாசார நிகழ்வுகள்' },
    ],
  },
  {
    slug: 'sports-gala',
    name: 'Sports Gala',
    categorySlug: 'community-engagement',
    subcategorySlug: 'sports-events',
    sortOrder: 82,
    translations: [
      { locale: 'en', name: 'Sports Gala' },
      { locale: 'si', name: 'ක්‍රීඩා උත්සව' },
      { locale: 'ta', name: 'விளையாட்டு நிகழ்வுகள்' },
    ],
  },
  {
    slug: 'youth-leadership',
    name: 'Youth Leadership',
    categorySlug: 'community-engagement',
    subcategorySlug: 'youth-programs',
    sortOrder: 83,
    translations: [
      { locale: 'en', name: 'Youth Leadership' },
      { locale: 'si', name: 'තරුණ වැඩසටහන්' },
      { locale: 'ta', name: 'இளைஞர் திட்டங்கள்' },
    ],
  },
  {
    slug: 'csr-highlights',
    name: 'CSR Highlights',
    categorySlug: 'community-engagement',
    subcategorySlug: 'csr-activities',
    sortOrder: 84,
    translations: [
      { locale: 'en', name: 'CSR Highlights' },
      { locale: 'si', name: 'සමාජ වගකීම් ක්‍රියාකාරකම්' },
      { locale: 'ta', name: 'சமூகப் பொறுப்பு நடவடிக்கைகள்' },
    ],
  },

  // Claims & Fact Checks
  {
    slug: 'unverified-rumors',
    name: 'Unverified Rumors',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'unverified-claims',
    sortOrder: 90,
    translations: [
      { locale: 'en', name: 'Unverified Rumors' },
      { locale: 'si', name: 'සත්‍යාපනය නොකළ ප්‍රකාශ' },
      { locale: 'ta', name: 'சரிபார்க்கப்படாத கூற்றுகள்' },
    ],
  },
  {
    slug: 'fact-check-friday',
    name: 'Fact Check Friday',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'fact-checked-claims',
    sortOrder: 91,
    translations: [
      { locale: 'en', name: 'Fact Check Friday' },
      { locale: 'si', name: 'සත්‍ය පරීක්ෂා කළ ප්‍රකාශ' },
      { locale: 'ta', name: 'உண்மை சரிபார்க்கப்பட்ட கூற்றுகள்' },
    ],
  },
  {
    slug: 'misleading-claims',
    name: 'Misleading Claims',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'misleading-statements',
    sortOrder: 92,
    translations: [
      { locale: 'en', name: 'Misleading Claims' },
      { locale: 'si', name: 'නොමඟ යවන ප්‍රකාශ' },
      { locale: 'ta', name: 'தவறாக வழிநடத்தும் கூற்றுகள்' },
    ],
  },
  {
    slug: 'contradicted-claims',
    name: 'Contradicted Claims',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'contradicted-statements',
    sortOrder: 93,
    translations: [
      { locale: 'en', name: 'Contradicted Claims' },
      { locale: 'si', name: 'පරස්පර ප්‍රකාශ' },
      { locale: 'ta', name: 'முரண்பட்ட கூற்றுகள்' },
    ],
  },
  {
    slug: 'broken-promises-tracker',
    name: 'Broken Promises Tracker',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'broken-promises',
    sortOrder: 94,
    translations: [
      { locale: 'en', name: 'Broken Promises Tracker' },
      { locale: 'si', name: 'කඩ වූ පොරොන්දු' },
      { locale: 'ta', name: 'மீறப்பட்ட வாக்குறுதிகள்' },
    ],
  },
  {
    slug: 'policy-reversal-watch',
    name: 'Policy Reversal Watch',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'policy-reversals',
    sortOrder: 95,
    translations: [
      { locale: 'en', name: 'Policy Reversal Watch' },
      { locale: 'si', name: 'ප්‍රතිපත්ති පෙරළීම්' },
      { locale: 'ta', name: 'கொள்கை மாற்றங்கள்' },
    ],
  },
  {
    slug: 'data-check-desk',
    name: 'Data Check Desk',
    categorySlug: 'claims-fact-checks',
    subcategorySlug: 'data-accuracy-reviews',
    sortOrder: 96,
    translations: [
      { locale: 'en', name: 'Data Check Desk' },
      { locale: 'si', name: 'දත්ත නිරවද්‍යතා සමාලෝචන' },
      { locale: 'ta', name: 'தரவு துல்லிய மதிப்பாய்வுகள்' },
    ],
  },
];
