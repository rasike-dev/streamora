import { IsEnum } from 'class-validator';

export enum VideoVisibilityDto {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

export class UpdateVideoVisibilityDto {
  @IsEnum(VideoVisibilityDto)
  visibility!: VideoVisibilityDto;
}
