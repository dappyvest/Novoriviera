import { Module } from '@nestjs/common';
import { SubmissionsModule } from '../submissions/submissions.module';
import { VotesModule } from '../votes/votes.module';
import { StagesController } from './stages.controller';
import { StagesService } from './stages.service';

@Module({
  imports: [SubmissionsModule, VotesModule],
  controllers: [StagesController],
  providers: [StagesService],
  exports: [StagesService],
})
export class StagesModule {}
