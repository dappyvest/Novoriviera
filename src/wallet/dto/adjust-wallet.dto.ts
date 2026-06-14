import { IsInt, IsString } from 'class-validator';

export class AdjustWalletDto {
  @IsInt()
  amount!: number;

  @IsString()
  reason!: string;
}
