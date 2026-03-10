export enum VideoVisibilityDto {
  PUBLIC = 'PUBLIC',
  UNLISTED = 'UNLISTED',
  PRIVATE = 'PRIVATE',
}

export class UpdateVideoVisibilityDto {
  visibility!: VideoVisibilityDto;
}
