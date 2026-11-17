import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateManualVoteIntentDto {
  @IsString()
  @IsOptional()
  contestantCode?: string;

  @IsString()
  @IsOptional()
  contestantId?: string;

  @IsInt()
  @Min(1)
  voteQuantity!: number;
}

export class SubmitManualVotePaymentDto {
  @IsString()
  paymentReference!: string;

  @IsString()
  voterName!: string;

  @IsString()
  voterPhone!: string;

  @IsEmail()
  @IsOptional()
  voterEmail?: string;

  @IsString()
  @IsOptional()
  transferReference?: string;

  @IsString()
  @IsOptional()
  note?: string;
}
