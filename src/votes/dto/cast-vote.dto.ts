import { IsDivisibleBy, IsInt, IsString, Min } from 'class-validator';

export class CastVoteDto {
  @IsString()
  contestantId!: string;

  @IsString()
  stageId!: string;

  @IsInt()
  @Min(10)
  @IsDivisibleBy(10)
  coinsToSpend!: number;
}
