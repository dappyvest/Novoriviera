import { IsBoolean, IsISO8601, IsOptional } from 'class-validator';

export class UpdateContestantPremiumDto {
  @IsBoolean()
  isPremium!: boolean;

  @IsISO8601()
  @IsOptional()
  premiumExpiresAt?: string;
}
