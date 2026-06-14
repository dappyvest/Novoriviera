import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { VotesModule } from '../votes/votes.module';
import { ContestantsController } from './contestants.controller';
import { ContestantsService } from './contestants.service';

@Module({
  imports: [SubmissionsModule, VotesModule],
  controllers: [ContestantsController],
  providers: [ContestantsService],
  exports: [ContestantsService],
})
export class ContestantsModule {}
