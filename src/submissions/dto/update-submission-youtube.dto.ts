import { IsOptional, IsString } from 'class-validator';

export class UpdateSubmissionYoutubeDto {
  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @IsString()
  @IsOptional()
  youtubeVideoId?: string;

  @IsString()
  @IsOptional()
  tiktokUrl?: string;

  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  externalVideoUrl?: string;

  @IsString()
  @IsOptional()
  thumbnailUrl?: string;
}
