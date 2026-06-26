import { ManualVotePaymentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdatePublicVoteStatusDto {
  @IsEnum(ManualVotePaymentStatus)
  status!: ManualVotePaymentStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
