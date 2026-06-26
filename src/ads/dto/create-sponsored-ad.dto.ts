import { SponsoredAdPlacement, SponsoredAdStatus } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Min,
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

  @IsEnum(SponsoredAdPlacement)
  placement!: SponsoredAdPlacement;

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
