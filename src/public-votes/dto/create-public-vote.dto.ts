import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreatePublicVoteDto {
  @IsString()
  contestantCode!: string;

  @IsString()
  competitionId!: string;

  @IsString()
  voterName!: string;

  @IsString()
  voterPhone!: string;

  @IsEmail()
  @IsOptional()
  voterEmail?: string;

  @IsInt()
  @Min(1)
  amountPaid!: number;

  @IsString()
  @IsOptional()
  transferReference?: string;

  @IsString()
  @IsOptional()
  paymentNarration?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  proofImageUrl?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
