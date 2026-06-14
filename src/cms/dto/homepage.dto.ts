import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateHomepageDto {
  @IsString()
  @IsOptional()
  heroTitle?: string;

  @IsString()
  @IsOptional()
  heroSubtitle?: string;

  @IsString()
  @IsOptional()
  heroImageUrl?: string;

  @IsString()
  @IsOptional()
  primaryCtaText?: string;

  @IsString()
  @IsOptional()
  primaryCtaUrl?: string;

  @IsString()
  @IsOptional()
  secondaryCtaText?: string;

  @IsString()
  @IsOptional()
  secondaryCtaUrl?: string;

  @IsString()
  @IsOptional()
  featuredCompetitionId?: string;

  @IsString()
  @IsOptional()
  announcementText?: string;

  @IsBoolean()
  @IsOptional()
  announcementIsActive?: boolean;
}
