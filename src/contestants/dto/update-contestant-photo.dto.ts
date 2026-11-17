import { IsNotEmpty, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateContestantPhotoDto {
  @IsUrl({ protocols: ['https'], require_protocol: true })
  photoUrl!: string;

  @IsString()
  @IsNotEmpty()
  photoPublicId!: string;

  @IsObject()
  @IsOptional()
  photoMeta?: Record<string, unknown>;
}
