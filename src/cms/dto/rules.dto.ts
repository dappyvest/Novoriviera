import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateRulesDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
