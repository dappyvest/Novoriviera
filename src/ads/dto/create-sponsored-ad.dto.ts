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
  ValidateIf,
} from 'class-validator';

export class CreateSponsoredAdDto {
  @IsString()
  title!: string;

  @IsString()
  productName!: string;

  @IsString()
  description!: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  imageUrl?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  videoUrl?: string;

  @IsString()
  @IsOptional()
  videoPublicId?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  targetUrl?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  whatsappUrl?: string;

  @IsUrl({ require_tld: false })
  @IsOptional()
  socialUrl?: string;

  @ValidateIf((dto: CreateSponsoredAdDto) => !dto.placements?.length)
  @IsEnum(SponsoredAdPlacement, {
    message:
      'placement must be one of HOME_TOP, HOME_MIDDLE, LEADERBOARD, COMPETITION_PAGE, CONTESTANT_PAGE',
  })
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
  destinationValue?: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  @IsEnum(SponsoredAdStatus)
  @IsOptional()
  status?: SponsoredAdStatus;

  @IsDateString()
  @IsOptional()
  startsAt?: string;

  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}
