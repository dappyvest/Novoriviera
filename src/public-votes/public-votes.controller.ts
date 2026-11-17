import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ManualVotePaymentStatus, UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PublicVotesService } from './public-votes.service';

@Controller('public-votes')
export class PublicVotesController {
  constructor(private readonly publicVotesService: PublicVotesService) {}

  // Historical manual-transfer endpoints are intentionally disabled.

}

@Controller('admin/public-votes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPublicVotesController {
  constructor(private readonly publicVotesService: PublicVotesService) {}
  @Get() findAdmin(@Query('status') status?: ManualVotePaymentStatus, @Query('competitionId') competitionId?: string, @Query('contestantCode') contestantCode?: string) { return this.publicVotesService.findAdmin({ status, competitionId, contestantCode }); }
  @Get(':id') findOne(@Param('id') id: string) { return this.publicVotesService.findOne(id); }
}
