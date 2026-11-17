import {
  SponsoredAdDestinationType,
  SponsoredAdPlacement,
  SponsoredAdStatus,
} from '@prisma/client';
import {
  ArrayNotEmpty,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsArray,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class UpdateSponsoredAdDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  productName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string | null;

  @IsUrl({ require_tld: false })
  @IsOptional()
  videoUrl?: string | null;

  @IsString()
  @IsOptional()
  videoPublicId?: string | null;

  @IsUrl({ require_tld: false })
  @IsOptional()
  targetUrl?: string | null;

  @IsUrl({ require_tld: false })
  @IsOptional()
  whatsappUrl?: string | null;

  @IsUrl({ require_tld: false })
  @IsOptional()
  socialUrl?: string | null;

  @IsEnum(SponsoredAdPlacement)
  @IsOptional()
  placement?: SponsoredAdPlacement;

  @IsEnum(SponsoredAdPlacement, {
    each: true,
    message:
      'each placement must be one of HOME_TOP, HOME_MIDDLE, LEADERBOARD, COMPETITION_PAGE, CONTESTANT_PAGE',
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'placements must contain at least one location' })
  @IsOptional()
  placements?: SponsoredAdPlacement[];

  @IsEnum(SponsoredAdDestinationType)
  @IsOptional()
  destinationType?: SponsoredAdDestinationType;

  @IsString()
  @IsOptional()
  destinationValue?: string | null;

  @IsString()
  @IsOptional()
  buttonText?: string | null;

  @IsEnum(SponsoredAdStatus)
  @IsOptional()
  status?: SponsoredAdStatus;

  @IsDateString()
  @IsOptional()
  startsAt?: string | null;

  @IsDateString()
  @IsOptional()
  endsAt?: string | null;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
