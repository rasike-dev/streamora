import { TagStatus } from '@prisma/client';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class MergeTagDto {
  /** Surviving tag. All assignments from the source tag move here. */
  @IsString()
  targetTagId!: string;
}

export class UpdateTagStatusDto {
  @IsIn(['ACTIVE', 'PENDING', 'BLOCKED'])
  status!: Exclude<TagStatus, 'MERGED'>;

  /**
   * Detach the tag from existing videos and media when blocking.
   * Defaults to true: leaving an abusive tag attached would defeat the block.
   */
  @IsOptional()
  @IsBoolean()
  removeAssignments?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class CreateTagAliasDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  alias!: string;
}
