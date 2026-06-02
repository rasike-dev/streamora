import { IsOptional, IsString, ValidateIf } from 'class-validator';

export class UpdateVideoScheduleDto {
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  scheduledAt!: string | null;
}
