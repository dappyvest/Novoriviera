import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateCoinPackageDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  priceNaira?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  coins?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  bonusCoins?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
