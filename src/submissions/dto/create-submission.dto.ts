import { IsObject, IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  uploadUrl?: string;

  @IsString()
  @IsOptional()
  cloudinaryPublicId?: string;

  @IsString()
  @IsOptional()
  cloudinarySecureUrl?: string;

  @IsObject()
  @IsOptional()
  uploadedFileMeta?: Record<string, unknown>;
}
