import { IsBoolean, IsOptional } from 'class-validator';

export class DeclareWinnersDto {
  @IsBoolean()
  @IsOptional()
  force?: boolean;
}
