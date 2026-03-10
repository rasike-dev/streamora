export class VideoTranslationInput {
  locale: 'en' | 'si' | 'ta';
  title?: string;
  description?: string;
  tagline?: string;
  audience?: string;
}

export class UpdateVideoDraftDto {
  translations?: VideoTranslationInput[];
  channels?: string[];
  tags?: string[];
}
