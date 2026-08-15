import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class VideoTranslationInput {
  @IsIn(['en', 'si', 'ta'])
  locale!: 'en' | 'si' | 'ta';

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  audience?: string;
}

export class UpdateVideoDraftDto {
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VideoTranslationInput)
  translations?: VideoTranslationInput[];

  /** Channel slugs. Unknown or inactive slugs are rejected. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  /**
   * Slug of the channel that drives the Category > Subcategory breadcrumb.
   * Must be one of `channels`; defaults to the first selected channel.
   */
  @IsOptional()
  @IsString()
  primaryChannel?: string;

  /** Slugs of existing tags chosen from autocomplete. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  /** Free-typed tag names, created on demand under tag governance rules. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  newTags?: string[];
}
