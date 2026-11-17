import { StageStatus } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateStageDto {
  @IsString()
  title!: string;

  @IsInt()
  @Min(1)
  stageNumber!: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(StageStatus)
  @IsOptional()
  status?: StageStatus;

  @IsISO8601()
  @IsOptional()
  submissionStartDate?: string;

  @IsISO8601()
  @IsOptional()
  submissionEndDate?: string;

  @IsISO8601()
  @IsOptional()
  votingStartDate?: string;

  @IsISO8601()
  @IsOptional()
  votingEndDate?: string;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  eliminationPercentage?: number;
}
