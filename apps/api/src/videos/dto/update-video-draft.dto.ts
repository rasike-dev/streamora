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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  channels?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}
