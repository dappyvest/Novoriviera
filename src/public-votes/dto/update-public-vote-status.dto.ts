import { IsOptional, IsString } from 'class-validator';

export class UpdatePublicVoteStatusDto {
  @IsString()
  status!: 'CONFIRMED' | 'REJECTED';

  @IsString()
  @IsOptional()
  adminNote?: string;
}
