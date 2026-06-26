import { CompetitionStatus } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateCompetitionDto {
  @IsString()
  title!: string;

  @IsString()
  slug!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  bannerUrl?: string;

  @IsEnum(CompetitionStatus)
  @IsOptional()
  status?: CompetitionStatus;

  @IsISO8601()
  @IsOptional()
  startDate?: string;

  @IsISO8601()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  prizeFirst?: string;

  @IsString()
  @IsOptional()
  prizeSecond?: string;

  @IsString()
  @IsOptional()
  prizeThird?: string;

  @IsString()
  @IsOptional()
  rules?: string;

  @IsBoolean()
  @IsOptional()
  manualVotingEnabled?: boolean;

  @IsInt()
  @Min(1)
  @IsOptional()
  votePriceNaira?: number;

  @IsString()
  @IsOptional()
  paymentBankName?: string;

  @IsString()
  @IsOptional()
  paymentAccountName?: string;

  @IsString()
  @IsOptional()
  paymentAccountNumber?: string;

  @IsString()
  @IsOptional()
  paymentInstructions?: string;
}
