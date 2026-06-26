import { Module } from '@nestjs/common';
import {
  AdminPublicVotesController,
  PublicVotesController,
} from './public-votes.controller';
import { PublicVotesService } from './public-votes.service';

@Module({
  controllers: [PublicVotesController, AdminPublicVotesController],
  providers: [PublicVotesService],
  exports: [PublicVotesService],
})
export class PublicVotesModule {}
