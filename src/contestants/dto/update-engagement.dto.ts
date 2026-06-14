import { EngagementPlatform } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateEngagementDto {
  @IsString()
  @IsOptional()
  stageId?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  onlineEngagementCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  views?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  likes?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  comments?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  shares?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  watchScore?: number;

  @IsEnum(EngagementPlatform)
  @IsOptional()
  platform?: EngagementPlatform;

  @IsString()
  @IsOptional()
  note?: string;
}
