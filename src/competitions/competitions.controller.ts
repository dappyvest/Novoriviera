import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { ContestantsService } from '../contestants/contestants.service';
import { CreateContestantDto } from '../contestants/dto/create-contestant.dto';
import { CreateStageDto } from '../stages/dto/create-stage.dto';
import { StagesService } from '../stages/stages.service';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { DeclareWinnersDto } from './dto/declare-winners.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { CompetitionsService } from './competitions.service';

@Controller('competitions')
export class CompetitionsController {
  constructor(
    private readonly competitionsService: CompetitionsService,
    private readonly stagesService: StagesService,
    private readonly contestantsService: ContestantsService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(
    @Body() dto: CreateCompetitionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.competitionsService.create(dto, user.id);
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  findAll(@Req() request: { user?: CurrentUserPayload }) {
    return this.competitionsService.findAll(request.user?.role);
  }

  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @Req() request: { user?: CurrentUserPayload },
  ) {
    return this.competitionsService.findOne(id, request.user?.role);
  }

  @Get(':competitionId/leaderboard')
  leaderboard(
    @Param('competitionId') competitionId: string,
    @Query('featuredFirst') featuredFirst?: string,
    @Query('mode') mode?: 'votes' | 'engagement' | 'combined',
    @Query('engagementWeight') engagementWeight?: string,
    @Query('tokenWeight') tokenWeight?: string,
  ) {
    return this.competitionsService.leaderboard(
      competitionId,
      featuredFirst === 'true',
      mode ?? 'votes',
      engagementWeight ? Number(engagementWeight) : undefined,
      tokenWeight ? Number(tokenWeight) : undefined,
    );
  }

  @Get(':competitionId/winners')
  winners(@Param('competitionId') competitionId: string) {
    return this.competitionsService.findWinners(competitionId);
  }

  @Post(':competitionId/stages')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createStage(
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(competitionId, dto);
  }

  @Get(':competitionId/stages')
  findStages(@Param('competitionId') competitionId: string) {
    return this.stagesService.findByCompetition(competitionId);
  }

  @Post(':competitionId/contestants')
  @UseGuards(JwtAuthGuard)
  registerContestant(
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateContestantDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.contestantsService.register(user.id, competitionId, dto);
  }

  @Post(':competitionId/declare-winners')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  declareWinners(
    @Param('competitionId') competitionId: string,
    @Body() dto: DeclareWinnersDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.competitionsService.declareWinners(
      competitionId,
      user.role,
      Boolean(dto.force),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCompetitionDto) {
    return this.competitionsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.competitionsService.remove(id);
  }
}
