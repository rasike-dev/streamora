/**
 * Initial Category > Subcategory taxonomy from proposal section 5.
 *
 * This is configuration data, not application logic: admins can rename, reorder,
 * archive and extend all of it through /admin/taxonomy without a deploy. Slugs are
 * explicit rather than derived so that renaming a category in the admin UI never
 * silently changes a public URL.
 */

export type TaxonomyTranslation = {
  locale: 'en' | 'si' | 'ta';
  name: string;
};

export type SubcategorySeed = {
  slug: string;
  name: string;
  translations: TaxonomyTranslation[];
};

export type CategorySeed = {
  slug: string;
  name: string;
  description: string;
  translations: TaxonomyTranslation[];
  subcategories: SubcategorySeed[];
};

export const TAXONOMY_SEED: CategorySeed[] = [
  {
    slug: 'leadership-speeches',
    name: 'Leadership & Speeches',
    description: 'Addresses and statements from party leadership.',
    translations: [
      { locale: 'en', name: 'Leadership & Speeches' },
      { locale: 'si', name: 'නායකත්වය සහ කථා' },
      { locale: 'ta', name: 'தலைமைத்துவம் மற்றும் உரைகள்' },
    ],
    subcategories: [
      {
        slug: 'party-leader-speeches',
        name: 'Party Leader Speeches',
        translations: [
          { locale: 'en', name: 'Party Leader Speeches' },
          { locale: 'si', name: 'පක්ෂ නායක කථා' },
          { locale: 'ta', name: 'கட்சித் தலைவர் உரைகள்' },
        ],
      },
      {
        slug: 'national-organizer-speeches',
        name: 'National Organizer Speeches',
        translations: [
          { locale: 'en', name: 'National Organizer Speeches' },
          { locale: 'si', name: 'ජාතික සංවිධායක කථා' },
          { locale: 'ta', name: 'தேசிய அமைப்பாளர் உரைகள்' },
        ],
      },
      {
        slug: 'parliamentary-speeches',
        name: 'Parliamentary Speeches',
        translations: [
          { locale: 'en', name: 'Parliamentary Speeches' },
          { locale: 'si', name: 'පාර්ලිමේන්තු කථා' },
          { locale: 'ta', name: 'நாடாளுமன்ற உரைகள்' },
        ],
      },
      {
        slug: 'public-meetings',
        name: 'Public Meetings',
        translations: [
          { locale: 'en', name: 'Public Meetings' },
          { locale: 'si', name: 'ප්‍රසිද්ධ රැස්වීම්' },
          { locale: 'ta', name: 'பொதுக் கூட்டங்கள்' },
        ],
      },
      {
        slug: 'special-addresses',
        name: 'Special Addresses',
        translations: [
          { locale: 'en', name: 'Special Addresses' },
          { locale: 'si', name: 'විශේෂ දේශන' },
          { locale: 'ta', name: 'சிறப்பு உரைகள்' },
        ],
      },
      {
        slug: 'press-statements',
        name: 'Press Statements',
        translations: [
          { locale: 'en', name: 'Press Statements' },
          { locale: 'si', name: 'මාධ්‍ය නිවේදන' },
          { locale: 'ta', name: 'ஊடக அறிக்கைகள்' },
        ],
      },
    ],
  },
  {
    slug: 'election-campaigns',
    name: 'Election Campaigns',
    description: 'Campaign material across every level of election.',
    translations: [
      { locale: 'en', name: 'Election Campaigns' },
      { locale: 'si', name: 'මැතිවරණ ප්‍රචාරක' },
      { locale: 'ta', name: 'தேர்தல் பிரச்சாரங்கள்' },
    ],
    subcategories: [
      {
        slug: 'presidential-elections',
        name: 'Presidential Elections',
        translations: [
          { locale: 'en', name: 'Presidential Elections' },
          { locale: 'si', name: 'ජනාධිපතිවරණ' },
          { locale: 'ta', name: 'ஜனாதிபதித் தேர்தல்கள்' },
        ],
      },
      {
        slug: 'parliamentary-elections',
        name: 'Parliamentary Elections',
        translations: [
          { locale: 'en', name: 'Parliamentary Elections' },
          { locale: 'si', name: 'පාර්ලිමේන්තු මැතිවරණ' },
          { locale: 'ta', name: 'நாடாளுமன்றத் தேர்தல்கள்' },
        ],
      },
      {
        slug: 'provincial-council-elections',
        name: 'Provincial Council Elections',
        translations: [
          { locale: 'en', name: 'Provincial Council Elections' },
          { locale: 'si', name: 'පළාත් සභා මැතිවරණ' },
          { locale: 'ta', name: 'மாகாண சபைத் தேர்தல்கள்' },
        ],
      },
      {
        slug: 'local-government-elections',
        name: 'Local Government Elections',
        translations: [
          { locale: 'en', name: 'Local Government Elections' },
          { locale: 'si', name: 'පළාත් පාලන මැතිවරණ' },
          { locale: 'ta', name: 'உள்ளூராட்சித் தேர்தல்கள்' },
        ],
      },
      {
        slug: 'campaign-advertisements',
        name: 'Campaign Advertisements',
        translations: [
          { locale: 'en', name: 'Campaign Advertisements' },
          { locale: 'si', name: 'ප්‍රචාරක දැන්වීම්' },
          { locale: 'ta', name: 'பிரச்சார விளம்பரங்கள்' },
        ],
      },
      {
        slug: 'campaign-launches',
        name: 'Campaign Launches',
        translations: [
          { locale: 'en', name: 'Campaign Launches' },
          { locale: 'si', name: 'ප්‍රචාරක ආරම්භ' },
          { locale: 'ta', name: 'பிரச்சாரத் தொடக்கங்கள்' },
        ],
      },
      {
        slug: 'victory-celebrations',
        name: 'Victory Celebrations',
        translations: [
          { locale: 'en', name: 'Victory Celebrations' },
          { locale: 'si', name: 'ජයග්‍රහණ සැමරුම්' },
          { locale: 'ta', name: 'வெற்றிக் கொண்டாட்டங்கள்' },
        ],
      },
    ],
  },
  {
    slug: 'party-events',
    name: 'Party Events',
    description: 'Conventions, conferences and organisational programmes.',
    translations: [
      { locale: 'en', name: 'Party Events' },
      { locale: 'si', name: 'පක්ෂ උත්සව' },
      { locale: 'ta', name: 'கட்சி நிகழ்வுகள்' },
    ],
    subcategories: [
      {
        slug: 'annual-conventions',
        name: 'Annual Conventions',
        translations: [
          { locale: 'en', name: 'Annual Conventions' },
          { locale: 'si', name: 'වාර්ෂික සම්මේලන' },
          { locale: 'ta', name: 'ஆண்டு மாநாடுகள்' },
        ],
      },
      {
        slug: 'party-conferences',
        name: 'Party Conferences',
        translations: [
          { locale: 'en', name: 'Party Conferences' },
          { locale: 'si', name: 'පක්ෂ සමුළු' },
          { locale: 'ta', name: 'கட்சி மாநாடுகள்' },
        ],
      },
      {
        slug: 'membership-programs',
        name: 'Membership Programs',
        translations: [
          { locale: 'en', name: 'Membership Programs' },
          { locale: 'si', name: 'සාමාජික වැඩසටහන්' },
          { locale: 'ta', name: 'உறுப்பினர் திட்டங்கள்' },
        ],
      },
      {
        slug: 'training-programs',
        name: 'Training Programs',
        translations: [
          { locale: 'en', name: 'Training Programs' },
          { locale: 'si', name: 'පුහුණු වැඩසටහන්' },
          { locale: 'ta', name: 'பயிற்சித் திட்டங்கள்' },
        ],
      },
      {
        slug: 'youth-wing-events',
        name: 'Youth Wing Events',
        translations: [
          { locale: 'en', name: 'Youth Wing Events' },
          { locale: 'si', name: 'තරුණ අංශ උත්සව' },
          { locale: 'ta', name: 'இளைஞர் அணி நிகழ்வுகள்' },
        ],
      },
      {
        slug: 'womens-wing-events',
        name: "Women's Wing Events",
        translations: [
          { locale: 'en', name: "Women's Wing Events" },
          { locale: 'si', name: 'කාන්තා අංශ උත්සව' },
          { locale: 'ta', name: 'மகளிர் அணி நிகழ்வுகள்' },
        ],
      },
    ],
  },
  {
    slug: 'media-coverage',
    name: 'Media Coverage',
    description: 'Interviews, debates and press appearances.',
    translations: [
      { locale: 'en', name: 'Media Coverage' },
      { locale: 'si', name: 'මාධ්‍ය ආවරණය' },
      { locale: 'ta', name: 'ஊடக செய்தி வெளியீடு' },
    ],
    subcategories: [
      {
        slug: 'tv-interviews',
        name: 'TV Interviews',
        translations: [
          { locale: 'en', name: 'TV Interviews' },
          { locale: 'si', name: 'රූපවාහිනී සම්මුඛ සාකච්ඡා' },
          { locale: 'ta', name: 'தொலைக்காட்சி நேர்காணல்கள்' },
        ],
      },
      {
        slug: 'tv-debates',
        name: 'TV Debates',
        translations: [
          { locale: 'en', name: 'TV Debates' },
          { locale: 'si', name: 'රූපවාහිනී විවාද' },
          { locale: 'ta', name: 'தொலைக்காட்சி விவாதங்கள்' },
        ],
      },
      {
        slug: 'news-coverage',
        name: 'News Coverage',
        translations: [
          { locale: 'en', name: 'News Coverage' },
          { locale: 'si', name: 'ප්‍රවෘත්ති ආවරණය' },
          { locale: 'ta', name: 'செய்தி வெளியீடு' },
        ],
      },
      {
        slug: 'press-conferences',
        name: 'Press Conferences',
        translations: [
          { locale: 'en', name: 'Press Conferences' },
          { locale: 'si', name: 'මාධ්‍ය හමු' },
          { locale: 'ta', name: 'ஊடகச் சந்திப்புகள்' },
        ],
      },
      {
        slug: 'radio-programs',
        name: 'Radio Programs',
        translations: [
          { locale: 'en', name: 'Radio Programs' },
          { locale: 'si', name: 'ගුවන්විදුලි වැඩසටහන්' },
          { locale: 'ta', name: 'வானொலி நிகழ்ச்சிகள்' },
        ],
      },
      {
        slug: 'podcasts',
        name: 'Podcasts',
        translations: [
          { locale: 'en', name: 'Podcasts' },
          { locale: 'si', name: 'පොඩ්කාස්ට්' },
          { locale: 'ta', name: 'பாட்காஸ்ட்கள்' },
        ],
      },
    ],
  },
  {
    slug: 'social-media-content',
    name: 'Social Media Content',
    description: 'Short-form and platform-native video.',
    translations: [
      { locale: 'en', name: 'Social Media Content' },
      { locale: 'si', name: 'සමාජ මාධ්‍ය අන්තර්ගතය' },
      { locale: 'ta', name: 'சமூக ஊடக உள்ளடக்கம்' },
    ],
    subcategories: [
      {
        slug: 'facebook-videos',
        name: 'Facebook Videos',
        translations: [
          { locale: 'en', name: 'Facebook Videos' },
          { locale: 'si', name: 'ෆේස්බුක් වීඩියෝ' },
          { locale: 'ta', name: 'முகநூல் காணொளிகள்' },
        ],
      },
      {
        slug: 'tiktok-videos',
        name: 'TikTok Videos',
        translations: [
          { locale: 'en', name: 'TikTok Videos' },
          { locale: 'si', name: 'ටික්ටොක් වීඩියෝ' },
          { locale: 'ta', name: 'டிக்டாக் காணொளிகள்' },
        ],
      },
      {
        slug: 'youtube-shorts',
        name: 'YouTube Shorts',
        translations: [
          { locale: 'en', name: 'YouTube Shorts' },
          { locale: 'si', name: 'යූටියුබ් ෂෝට්ස්' },
          { locale: 'ta', name: 'யூடியூப் ஷார்ட்ஸ்' },
        ],
      },
      {
        slug: 'instagram-reels',
        name: 'Instagram Reels',
        translations: [
          { locale: 'en', name: 'Instagram Reels' },
          { locale: 'si', name: 'ඉන්ස්ටග්‍රෑම් රීල්ස්' },
          { locale: 'ta', name: 'இன்ஸ்டாகிராம் ரீல்ஸ்' },
        ],
      },
      {
        slug: 'x-twitter-videos',
        name: 'X/Twitter Videos',
        translations: [
          { locale: 'en', name: 'X/Twitter Videos' },
          { locale: 'si', name: 'X/ට්විටර් වීඩියෝ' },
          { locale: 'ta', name: 'X/ட்விட்டர் காணொளிகள்' },
        ],
      },
      {
        slug: 'viral-content',
        name: 'Viral Content',
        translations: [
          { locale: 'en', name: 'Viral Content' },
          { locale: 'si', name: 'වයිරල් අන්තර්ගතය' },
          { locale: 'ta', name: 'வைரல் உள்ளடக்கம்' },
        ],
      },
    ],
  },
  {
    slug: 'district-local-content',
    name: 'District & Local Content',
    description: 'Regional campaigns and grassroots activity.',
    translations: [
      { locale: 'en', name: 'District & Local Content' },
      { locale: 'si', name: 'දිස්ත්‍රික් සහ ප්‍රාදේශීය අන්තර්ගතය' },
      { locale: 'ta', name: 'மாவட்ட மற்றும் உள்ளூர் உள்ளடக்கம்' },
    ],
    subcategories: [
      {
        slug: 'district-campaigns',
        name: 'District Campaigns',
        translations: [
          { locale: 'en', name: 'District Campaigns' },
          { locale: 'si', name: 'දිස්ත්‍රික් ප්‍රචාරක' },
          { locale: 'ta', name: 'மாவட்டப் பிரச்சாரங்கள்' },
        ],
      },
      {
        slug: 'electoral-organizers',
        name: 'Electoral Organizers',
        translations: [
          { locale: 'en', name: 'Electoral Organizers' },
          { locale: 'si', name: 'මැතිවරණ සංවිධායක' },
          { locale: 'ta', name: 'தேர்தல் அமைப்பாளர்கள்' },
        ],
      },
      {
        slug: 'local-success-stories',
        name: 'Local Success Stories',
        translations: [
          { locale: 'en', name: 'Local Success Stories' },
          { locale: 'si', name: 'ප්‍රාදේශීය සාර්ථක කතා' },
          { locale: 'ta', name: 'உள்ளூர் வெற்றிக் கதைகள்' },
        ],
      },
      {
        slug: 'community-events',
        name: 'Community Events',
        translations: [
          { locale: 'en', name: 'Community Events' },
          { locale: 'si', name: 'ප්‍රජා උත්සව' },
          { locale: 'ta', name: 'சமூக நிகழ்வுகள்' },
        ],
      },
      {
        slug: 'village-meetings',
        name: 'Village Meetings',
        translations: [
          { locale: 'en', name: 'Village Meetings' },
          { locale: 'si', name: 'ගම් රැස්වීම්' },
          { locale: 'ta', name: 'கிராமக் கூட்டங்கள்' },
        ],
      },
    ],
  },
  {
    slug: 'historical-archive',
    name: 'Historical Archive',
    description: 'Preserved material of long-term record value.',
    translations: [
      { locale: 'en', name: 'Historical Archive' },
      { locale: 'si', name: 'ඓතිහාසික සංරක්ෂිතය' },
      { locale: 'ta', name: 'வரலாற்று ஆவணக் காப்பகம்' },
    ],
    subcategories: [
      {
        slug: 'historical-speeches',
        name: 'Historical Speeches',
        translations: [
          { locale: 'en', name: 'Historical Speeches' },
          { locale: 'si', name: 'ඓතිහාසික කථා' },
          { locale: 'ta', name: 'வரலாற்று உரைகள்' },
        ],
      },
      {
        slug: 'election-archives',
        name: 'Election Archives',
        translations: [
          { locale: 'en', name: 'Election Archives' },
          { locale: 'si', name: 'මැතිවරණ සංරක්ෂිත' },
          { locale: 'ta', name: 'தேர்தல் ஆவணக் காப்பகங்கள்' },
        ],
      },
      {
        slug: 'party-milestones',
        name: 'Party Milestones',
        translations: [
          { locale: 'en', name: 'Party Milestones' },
          { locale: 'si', name: 'පක්ෂ සන්ධිස්ථාන' },
          { locale: 'ta', name: 'கட்சி மைல்கற்கள்' },
        ],
      },
      {
        slug: 'political-history',
        name: 'Political History',
        translations: [
          { locale: 'en', name: 'Political History' },
          { locale: 'si', name: 'දේශපාලන ඉතිහාසය' },
          { locale: 'ta', name: 'அரசியல் வரலாறு' },
        ],
      },
      {
        slug: 'legacy-leaders',
        name: 'Legacy Leaders',
        translations: [
          { locale: 'en', name: 'Legacy Leaders' },
          { locale: 'si', name: 'පූර්වගාමී නායකයෝ' },
          { locale: 'ta', name: 'முன்னோடித் தலைவர்கள்' },
        ],
      },
    ],
  },
  {
    slug: 'training-capacity-building',
    name: 'Training & Capacity Building',
    description: 'Internal skills development programmes.',
    translations: [
      { locale: 'en', name: 'Training & Capacity Building' },
      { locale: 'si', name: 'පුහුණුව සහ ධාරිතා සංවර්ධනය' },
      { locale: 'ta', name: 'பயிற்சி மற்றும் திறன் மேம்பாடு' },
    ],
    subcategories: [
      {
        slug: 'candidate-training',
        name: 'Candidate Training',
        translations: [
          { locale: 'en', name: 'Candidate Training' },
          { locale: 'si', name: 'අපේක්ෂක පුහුණුව' },
          { locale: 'ta', name: 'வேட்பாளர் பயிற்சி' },
        ],
      },
      {
        slug: 'social-media-training',
        name: 'Social Media Training',
        translations: [
          { locale: 'en', name: 'Social Media Training' },
          { locale: 'si', name: 'සමාජ මාධ්‍ය පුහුණුව' },
          { locale: 'ta', name: 'சமூக ஊடகப் பயிற்சி' },
        ],
      },
      {
        slug: 'volunteer-training',
        name: 'Volunteer Training',
        translations: [
          { locale: 'en', name: 'Volunteer Training' },
          { locale: 'si', name: 'ස්වේච්ඡා පුහුණුව' },
          { locale: 'ta', name: 'தன்னார்வலர் பயிற்சி' },
        ],
      },
      {
        slug: 'campaign-management',
        name: 'Campaign Management',
        translations: [
          { locale: 'en', name: 'Campaign Management' },
          { locale: 'si', name: 'ප්‍රචාරක කළමනාකරණය' },
          { locale: 'ta', name: 'பிரச்சார நிர்வாகம்' },
        ],
      },
      {
        slug: 'digital-communication',
        name: 'Digital Communication',
        translations: [
          { locale: 'en', name: 'Digital Communication' },
          { locale: 'si', name: 'ඩිජිටල් සන්නිවේදනය' },
          { locale: 'ta', name: 'டிஜிட்டல் தகவல் தொடர்பு' },
        ],
      },
    ],
  },
  {
    slug: 'community-engagement',
    name: 'Community Engagement',
    description: 'Public-facing social, cultural and civic activity.',
    translations: [
      { locale: 'en', name: 'Community Engagement' },
      { locale: 'si', name: 'ප්‍රජා සම්බන්ධතා' },
      { locale: 'ta', name: 'சமூக ஈடுபாடு' },
    ],
    subcategories: [
      {
        slug: 'religious-events',
        name: 'Religious Events',
        translations: [
          { locale: 'en', name: 'Religious Events' },
          { locale: 'si', name: 'ආගමික උත්සව' },
          { locale: 'ta', name: 'மத நிகழ்வுகள்' },
        ],
      },
      {
        slug: 'cultural-events',
        name: 'Cultural Events',
        translations: [
          { locale: 'en', name: 'Cultural Events' },
          { locale: 'si', name: 'සංස්කෘතික උත්සව' },
          { locale: 'ta', name: 'கலாசார நிகழ்வுகள்' },
        ],
      },
      {
        slug: 'sports-events',
        name: 'Sports Events',
        translations: [
          { locale: 'en', name: 'Sports Events' },
          { locale: 'si', name: 'ක්‍රීඩා උත්සව' },
          { locale: 'ta', name: 'விளையாட்டு நிகழ்வுகள்' },
        ],
      },
      {
        slug: 'youth-programs',
        name: 'Youth Programs',
        translations: [
          { locale: 'en', name: 'Youth Programs' },
          { locale: 'si', name: 'තරුණ වැඩසටහන්' },
          { locale: 'ta', name: 'இளைஞர் திட்டங்கள்' },
        ],
      },
      {
        slug: 'csr-activities',
        name: 'CSR Activities',
        translations: [
          { locale: 'en', name: 'CSR Activities' },
          { locale: 'si', name: 'සමාජ වගකීම් ක්‍රියාකාරකම්' },
          { locale: 'ta', name: 'சமூகப் பொறுப்பு நடவடிக்கைகள்' },
        ],
      },
    ],
  },
  {
    slug: 'claims-fact-checks',
    name: 'Claims & Fact Checks',
    description: 'Verification and accountability content.',
    translations: [
      { locale: 'en', name: 'Claims & Fact Checks' },
      { locale: 'si', name: 'ප්‍රකාශ සහ සත්‍ය පරීක්ෂාව' },
      { locale: 'ta', name: 'கூற்றுகள் மற்றும் உண்மைச் சரிபார்ப்புகள்' },
    ],
    subcategories: [
      {
        slug: 'unverified-claims',
        name: 'Unverified Claims',
        translations: [
          { locale: 'en', name: 'Unverified Claims' },
          { locale: 'si', name: 'සත්‍යාපනය නොකළ ප්‍රකාශ' },
          { locale: 'ta', name: 'சரிபார்க்கப்படாத கூற்றுகள்' },
        ],
      },
      {
        slug: 'fact-checked-claims',
        name: 'Fact-Checked Claims',
        translations: [
          { locale: 'en', name: 'Fact-Checked Claims' },
          { locale: 'si', name: 'සත්‍ය පරීක්ෂා කළ ප්‍රකාශ' },
          { locale: 'ta', name: 'உண்மை சரிபார்க்கப்பட்ட கூற்றுகள்' },
        ],
      },
      {
        slug: 'misleading-statements',
        name: 'Misleading Statements',
        translations: [
          { locale: 'en', name: 'Misleading Statements' },
          { locale: 'si', name: 'නොමඟ යවන ප්‍රකාශ' },
          { locale: 'ta', name: 'தவறாக வழிநடத்தும் கூற்றுகள்' },
        ],
      },
      {
        slug: 'contradicted-statements',
        name: 'Contradicted Statements',
        translations: [
          { locale: 'en', name: 'Contradicted Statements' },
          { locale: 'si', name: 'පරස්පර ප්‍රකාශ' },
          { locale: 'ta', name: 'முரண்பட்ட கூற்றுகள்' },
        ],
      },
      {
        slug: 'broken-promises',
        name: 'Broken Promises',
        translations: [
          { locale: 'en', name: 'Broken Promises' },
          { locale: 'si', name: 'කඩ වූ පොරොන්දු' },
          { locale: 'ta', name: 'மீறப்பட்ட வாக்குறுதிகள்' },
        ],
      },
      {
        slug: 'policy-reversals',
        name: 'Policy Reversals',
        translations: [
          { locale: 'en', name: 'Policy Reversals' },
          { locale: 'si', name: 'ප්‍රතිපත්ති පෙරළීම්' },
          { locale: 'ta', name: 'கொள்கை மாற்றங்கள்' },
        ],
      },
      {
        slug: 'data-accuracy-reviews',
        name: 'Data Accuracy Reviews',
        translations: [
          { locale: 'en', name: 'Data Accuracy Reviews' },
          { locale: 'si', name: 'දත්ත නිරවද්‍යතා සමාලෝචන' },
          { locale: 'ta', name: 'தரவு துல்லிய மதிப்பாய்வுகள்' },
        ],
      },
    ],
  },
];
