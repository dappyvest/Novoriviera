import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateContestantDto {
  @IsString()
  displayName!: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  location?: string;

  @IsString()
  @IsOptional()
  guardianName?: string;

  @IsString()
  @IsOptional()
  guardianPhone?: string;
}
