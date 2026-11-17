import { Module } from '@nestjs/common';
import {
  AdminPublicVotesController,
  PublicVotesController,
} from './public-votes.controller';
import { PublicVotesService } from './public-votes.service';
import { PublicVoteRateLimitGuard } from './public-vote-rate-limit.guard';

@Module({
  controllers: [PublicVotesController, AdminPublicVotesController],
  providers: [PublicVotesService, PublicVoteRateLimitGuard],
  exports: [PublicVotesService],
})
export class PublicVotesModule {}
