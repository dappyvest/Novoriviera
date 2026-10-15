import { IsOptional, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

}
