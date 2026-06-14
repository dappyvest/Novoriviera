import { ContestantStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateContestantStatusDto {
  @IsEnum(ContestantStatus)
  status!: ContestantStatus;
}
