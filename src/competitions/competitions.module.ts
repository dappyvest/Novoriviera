import { Module } from '@nestjs/common';
import { ContestantsModule } from '../contestants/contestants.module';
import { StagesModule } from '../stages/stages.module';
import { CompetitionsController } from './competitions.controller';
import { CompetitionsService } from './competitions.service';

@Module({
  imports: [ContestantsModule, StagesModule],
  controllers: [CompetitionsController],
  providers: [CompetitionsService],
  exports: [CompetitionsService],
})
export class CompetitionsModule {}
