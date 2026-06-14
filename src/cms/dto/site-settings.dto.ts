import { IsOptional, IsString } from 'class-validator';

export class UpdateSiteSettingsDto {
  @IsString()
  @IsOptional()
  siteName?: string;

  @IsString()
  @IsOptional()
  siteTagline?: string;

  @IsString()
  @IsOptional()
  aboutTitle?: string;

  @IsString()
  @IsOptional()
  aboutContent?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  whatsappNumber?: string;

  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  tiktokUrl?: string;

  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @IsString()
  @IsOptional()
  termsUrl?: string;

  @IsString()
  @IsOptional()
  privacyUrl?: string;
}
