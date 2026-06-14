import { IsInt, IsString, Min } from 'class-validator';

export class CastVoteDto {
  @IsString()
  contestantId!: string;

  @IsString()
  stageId!: string;

  @IsInt()
  @Min(1)
  coinsToSpend!: number;
}
