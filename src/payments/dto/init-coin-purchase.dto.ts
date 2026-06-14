import { IsString } from 'class-validator';

export class InitCoinPurchaseDto {
  @IsString()
  coinPackageId!: string;
}
