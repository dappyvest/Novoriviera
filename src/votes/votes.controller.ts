import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { CurrentUserPayload } from '../auth/types/current-user.type';
import { CastVoteDto } from './dto/cast-vote.dto';
import { VotesService } from './votes.service';

@Controller('votes')
export class VotesController {
  constructor(private readonly votesService: VotesService) {}

  @Post('cast')
  @UseGuards(JwtAuthGuard)
  cast(@CurrentUser() user: CurrentUserPayload, @Body() dto: CastVoteDto) {
    return this.votesService.cast(user.id, dto);
  }
}
