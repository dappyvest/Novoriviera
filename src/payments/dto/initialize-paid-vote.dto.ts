import { IsEmail, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class InitializePaidVoteDto {
  @IsString()
  contestantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsEmail()
  email?: string;

}
