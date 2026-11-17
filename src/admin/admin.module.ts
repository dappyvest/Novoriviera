import { Module } from '@nestjs/common';
import { AdsModule } from '../ads/ads.module';
import { CompetitionsModule } from '../competitions/competitions.module';
import { ContestantsModule } from '../contestants/contestants.module';
import { PaymentsModule } from '../payments/payments.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { VotesModule } from '../votes/votes.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    AdsModule,
    CompetitionsModule,
    ContestantsModule,
    PaymentsModule,
    SubmissionsModule,
    VotesModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
