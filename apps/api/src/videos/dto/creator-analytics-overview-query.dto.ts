import { Type } from 'class-transformer';
import { IsOptional, IsString, IsInt, Min } from 'class-validator';

export class CreatorAnalyticsOverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  days?: number;

  @IsOptional()
  @IsString()
  locale?: string;
}
