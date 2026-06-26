import { IsEmail, IsInt, IsObject, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsOptional()
  displayName?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  guardianName?: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  photoPublicId?: string;

  @IsObject()
  @IsOptional()
  photoMeta?: Record<string, unknown>;

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

  @IsString()
  @IsOptional()
  submissionTitle?: string;

  @IsString()
  @IsOptional()
  submissionDescription?: string;
}
