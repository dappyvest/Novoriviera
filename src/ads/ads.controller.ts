import { Controller, Get, Param, ParseEnumPipe, Post, Query } from '@nestjs/common';
import { SponsoredAdPlacement } from '@prisma/client';
import { AdsService } from './ads.service';

@Controller('ads')
export class AdsController {
  constructor(private readonly adsService: AdsService) {}

  @Get()
  findPublic(
    @Query(
      'placement',
      new ParseEnumPipe(SponsoredAdPlacement, { optional: true }),
    )
    placement?: SponsoredAdPlacement,
  ) {
    return this.adsService.findPublic(placement);
  }

  @Post(':id/click')
  trackClick(@Param('id') id: string) {
    return this.adsService.trackClick(id);
  }

  @Post(':id/impression')
  trackImpression(@Param('id') id: string) {
    return this.adsService.trackImpression(id);
  }
}
