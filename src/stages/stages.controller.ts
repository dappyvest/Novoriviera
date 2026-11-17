import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { CreateSubmissionDto } from '../submissions/dto/create-submission.dto';
import { SubmissionsService } from '../submissions/submissions.service';
import { VotesService } from '../votes/votes.service';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { StagesService } from './stages.service';

@Controller('stages')
export class StagesController {
  constructor(
    private readonly stagesService: StagesService,
    private readonly submissionsService: SubmissionsService,
    private readonly votesService: VotesService,
  ) {}

  @Post(':stageId/submissions')
  @UseGuards(JwtAuthGuard)
  createSubmission(
    @Param('stageId') stageId: string,
    @Body() dto: CreateSubmissionDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.submissionsService.create(user.id, stageId, dto);
  }

  @Get(':stageId/submissions')
  findSubmissions(@Param('stageId') stageId: string) {
    return this.submissionsService.findByStage(stageId);
  }

  @Get(':stageId/votes/summary')
  voteSummary(@Param('stageId') stageId: string) {
    return this.votesService.stageSummary(stageId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateStageDto) {
    return this.stagesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id') id: string) {
    return this.stagesService.remove(id);
  }

  @Post(':stageId/eliminate-bottom')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  eliminateBottom(@Param('stageId') stageId: string) {
    return this.stagesService.eliminateBottom(stageId);
  }
}
