import { SubmissionStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateSubmissionStatusDto {
  @IsEnum(SubmissionStatus)
  status!: SubmissionStatus;

  @IsString()
  @IsOptional()
  adminNote?: string;
}
