import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ManualVotePaymentStatus, UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { CreatePublicVoteDto } from './dto/create-public-vote.dto';
import { UpdatePublicVoteStatusDto } from './dto/update-public-vote-status.dto';
import { PublicVotesService } from './public-votes.service';

@Controller('public-votes')
export class PublicVotesController {
  constructor(private readonly publicVotesService: PublicVotesService) {}

  @Post()
  create(@Body() dto: CreatePublicVoteDto) {
    return this.publicVotesService.create(dto);
  }
}

@Controller('admin/public-votes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class AdminPublicVotesController {
  constructor(private readonly publicVotesService: PublicVotesService) {}

  @Get()
  findAdmin(
    @Query('status') status?: ManualVotePaymentStatus,
    @Query('competitionId') competitionId?: string,
    @Query('contestantCode') contestantCode?: string,
  ) {
    return this.publicVotesService.findAdmin({
      status,
      competitionId,
      contestantCode,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publicVotesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdatePublicVoteStatusDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.publicVotesService.updateStatus(id, dto, user.id);
  }
}
