import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCoinPackageDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(0)
  priceNaira!: number;

  @IsInt()
  @Min(1)
  coins!: number;

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
