import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { SubmissionsService } from '../submissions/submissions.service';
import { VotesService } from '../votes/votes.service';
import { ContestantsService } from './contestants.service';

@Controller('contestants')
export class ContestantsController {
  constructor(
    private readonly contestantsService: ContestantsService,
    private readonly submissionsService: SubmissionsService,
    private readonly votesService: VotesService,
  ) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: CurrentUserPayload) {
    return this.contestantsService.findMine(user.id);
  }

  @Get('me/submissions')
  @UseGuards(JwtAuthGuard)
  findMySubmissions(@CurrentUser() user: CurrentUserPayload) {
    return this.submissionsService.findMine(user.id);
  }

  @Get(':id/votes')
  @UseGuards(JwtAuthGuard)
  findVotes(@Param('id') id: string) {
    return this.votesService.contestantStats(id);
  }

  @Get('me/:competitionId')
  @UseGuards(JwtAuthGuard)
  findMineForCompetition(
    @CurrentUser() user: CurrentUserPayload,
    @Param('competitionId') competitionId: string,
  ) {
    return this.contestantsService.findMineForCompetition(
      user.id,
      competitionId,
    );
  }

  @Get(':id')
  findPublicProfile(@Param('id') id: string) {
    return this.contestantsService.findPublicProfile(id);
  }
}
