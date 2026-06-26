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
