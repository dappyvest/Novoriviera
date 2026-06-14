import { CompetitionStatus } from '@prisma/client';
import { IsEnum, IsISO8601, IsOptional, IsString } from 'class-validator';

export class UpdateCompetitionDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsEnum(CompetitionStatus)
  @IsOptional()
  status?: CompetitionStatus;

  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  prizeFirst?: string;

  @IsString()
  @IsOptional()
  prizeSecond?: string;

  @IsString()
  @IsOptional()
  prizeThird?: string;

  @IsString()
  @IsOptional()
  rules?: string;
}
